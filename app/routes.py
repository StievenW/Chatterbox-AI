from flask import render_template, jsonify, request, abort, url_for
from app import app
import os
import requests
from dotenv import load_dotenv
from functools import wraps
import hashlib
import time
import re
from werkzeug.middleware.proxy_fix import ProxyFix
import logging
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import imghdr
import mimetypes
import uuid
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure proxy and security
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

class SecurityUtils:
    @staticmethod
    def is_safe_path(path):
        """Modern path validation"""
        normalized_path = os.path.normpath(path)
        return not any(part.startswith('.') for part in normalized_path.split(os.sep))

    @staticmethod
    def sanitize_input(data):
        """Modern input sanitization"""
        if isinstance(data, dict):
            return all(SecurityUtils.sanitize_input(v) for v in data.values())
        elif isinstance(data, list):
            return all(SecurityUtils.sanitize_input(item) for item in data)
        elif isinstance(data, str):
            dangerous_patterns = [
                r'<script.*?>.*?</script>',
                r'javascript:',
                r'onerror=',
                r'onclick=',
                r'onload=',
                r'eval\(',
                r'document\.',
                r'window\.',
                r'fetch\(',
                r'localStorage',
                r'sessionStorage',
                r'indexedDB',
                r'WebSocket'
            ]
            return not any(re.search(pattern, data, re.I) for pattern in dangerous_patterns)
        return True

def validate_request(f):
    """Modern request validation decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        request_id = hashlib.md5(f"{time.time()}-{request.remote_addr}".encode()).hexdigest()[:8]
        
        try:
            # Validate user agent
            user_agent = request.headers.get('User-Agent', '').lower()
            blocked_agents = ['winget', 'wget', 'curl', 'postman', 'python-requests']
            if any(agent in user_agent for agent in blocked_agents):
                logger.warning(f"Blocked request from unauthorized agent: {user_agent} (ID: {request_id})")
                abort(403, 'Unauthorized client')

            # Validate request parameters
            suspicious_params = ['download', 'file', 'path', 'dir', 'winget']
            if any(param in request.args.keys() for param in suspicious_params):
                logger.warning(f"Blocked request with suspicious parameters (ID: {request_id})")
                abort(403, 'Invalid request parameters')

            # Validate path parameters
            for value in request.view_args.values() if request.view_args else []:
                if isinstance(value, str) and not SecurityUtils.is_safe_path(value):
                    logger.warning(f"Blocked request with unsafe path (ID: {request_id})")
                    abort(403, 'Invalid path')

            # Update batas ukuran request menjadi 50MB
            if request.content_length and request.content_length > 10 * 1024 * 1024:  # 10MB
                logger.warning(f"Blocked oversized request: {request.content_length} bytes (ID: {request_id})")
                abort(413, 'Request too large')

            # Validate JSON content
            if request.is_json:
                data = request.get_json()
                if not SecurityUtils.sanitize_input(data):
                    logger.warning(f"Blocked request with malicious content (ID: {request_id})")
                    abort(400, 'Invalid input detected')

            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Security validation error: {str(e)} (ID: {request_id})")
            abort(400, str(e))
            
    return decorated_function

# Apply security to all routes
@app.before_request
def security_check():
    path = request.path.lower()
    if any(s in path for s in ['.env', '.git', '.config', 'node_modules']):
        logger.warning(f"Blocked access to sensitive file: {path}")
        abort(403, 'Access Forbidden')

@app.route('/')
@validate_request
def index():
    """Route untuk halaman setup"""
    try:
        logger.info("Accessing setup page")
        return render_template('setup.html')
    except Exception as e:
        logger.error(f"Error rendering setup page: {str(e)}")
        return jsonify({
            "error": "Failed to load setup page",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500

@app.route('/chat')
@validate_request
def chat():
    """Route untuk halaman chat"""
    try:
        logger.info("Accessing chat page")
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error rendering chat page: {str(e)}")
        return jsonify({
            "error": "Failed to load chat page",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500

# Tambahkan route untuk favicon untuk menghindari 404
@app.route('/favicon.ico')
def favicon():
    return '', 204

# Tambahkan error handler untuk 404
@app.errorhandler(404)
def not_found_error(error):
    logger.warning(f"Page not found: {request.url}")
    if request.path.startswith('/api/'):
        return jsonify({
            "error": "Endpoint not found",
            "path": request.path,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 404
    return render_template('setup.html'), 404

# Tambahkan error handler untuk 500
@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    if request.path.startswith('/api/'):
        return jsonify({
            "error": "Internal server error",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500
    return render_template('setup.html'), 500

def create_session_with_retry():
    session = requests.Session()
    retries = Retry(
        total=3,  # Jumlah total retry
        backoff_factor=0.5,  # Waktu tunggu antara retry
        status_forcelist=[500, 502, 503, 504, 520, 522, 524],
        allowed_methods=["POST", "GET"]  # HTTP methods yang akan di-retry
    )
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session

@app.route('/api/chat', methods=['POST'])
@validate_request
def handle_chat():
    try:
        request_timeout = 60  # 60 detik
        
        data = request.json
        api_key = os.getenv('CHAI_API_KEY')
        
        if not api_key:
            return jsonify({"error": "API key not configured"}), 500
        
        headers = {
            "accept": "application/json", 
            "content-type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        messages = data['messages']
        is_first_message = data.get('isFirstMessage', False)
        
        if is_first_message:
            system_prompt = messages[0]['content']
            system_prompt += "\n\nWhen responding to the first message:\n"
            system_prompt += "- The user is responding to your initial greeting\n"
            system_prompt += "- Acknowledge their response naturally\n"
            system_prompt += "- Continue the conversation based on their response\n"
            system_prompt += "- Stay in character and maintain your personality\n"
            system_prompt += "- Reference the current time if appropriate\n"
            messages[0]['content'] = system_prompt

        payload = {
            "model": "chai_v3",
            "messages": messages,
            "max_tokens": 90000,
            "temperature": data.get('temperature', 0.7),
            "top_p": 0.92,
            "frequency_penalty": 0.4,
            "presence_penalty": 0.3,
        }

        # Gunakan session dengan retry mechanism
        session = create_session_with_retry()
        
        try:
            response = session.post(
                "https://api.chai-research.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=request_timeout
            )
            
            if response.status_code != 200:
                logger.error(f"API Error: {response.status_code} - {response.text}")
                return jsonify({
                    "error": f"API returned status code {response.status_code}",
                    "details": response.text
                }), response.status_code

            # Process the AI response
            ai_response = response.json()
            if 'choices' in ai_response and ai_response['choices']:
                ai_message = ai_response['choices'][0]['message']['content']
                ai_message = ai_message.replace('\n', '<br>')
                ai_response['choices'][0]['message']['content'] = ai_message

            return jsonify(ai_response)

        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {str(e)}")
            return jsonify({
                "error": "Connection to AI service failed. Please try again.",
                "details": str(e)
            }), 503
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Request timeout: {str(e)}")
            return jsonify({
                "error": "Request timed out. Please try again.",
                "details": str(e)
            }), 504
            
        except Exception as e:
            logger.error(f"Unexpected error in API request: {str(e)}")
            return jsonify({
                "error": "An unexpected error occurred",
                "details": str(e)
            }), 500
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({
            "error": "Failed to process chat request",
            "details": str(e)
        }), 500

@app.route('/api/save-personality', methods=['POST'])
@validate_request
def save_personality():
    data = request.json
    
    # Initialize the personality dictionary with required fields
    personality = {
        "userName": data.get("userName"),
        "name": data.get("name"),
        "age": data.get("age"),
        "location": data.get("location"),
        "traits": data.get("traits"),
        "temperature": data.get("temperature"),
    }
    
    # Hanya tambahkan interests jika diaktifkan
    if data.get("interestsEnabled", True):
        personality["interests"] = data.get("interests")
    
    # Hanya tambahkan speech jika diaktifkan
    if data.get("speechEnabled", True):
        personality["speech"] = data.get("speech")
    
    # Tambahkan greetings
    personality["greetings"] = data.get("greetings", [])
    
    # Tambahkan language preference
    personality["language"] = data.get("language", "en")

    return jsonify({
        "status": "success", 
        "personality": personality
    })

@app.route('/api/generate-traits', methods=['POST'])
@validate_request
def generate_traits():
    try:
        logger.info("Received generate-traits request")
        
        data = request.json
        if not data:
            logger.error("No JSON data received")
            return jsonify({"error": "No data provided"}), 400
            
        reference = data.get('reference', '')
        language = data.get('language', 'en')  # Default to English if not specified
        
        if not reference:
            logger.error("No reference provided")
            return jsonify({"error": "Reference is required"}), 400

        # Language-specific prompts
        prompts = {
            'en': (
                f"Generate a complex personality profile for a character based on the following reference: {reference}. "
                "Present the traits in the following format:\n"
                "- Trait 1: Description\n"
                "- Trait 2: Description\n"
                "- Trait 3: Description\n"
                "- Trait 4: Description\n"
                "- Trait 5: Description"
            ),
            'id': (
                f"Buatkan profil kepribadian yang kompleks untuk karakter berdasarkan referensi berikut: {reference}. "
                "Sajikan sifat-sifatnya dalam format berikut:\n"
                "- Sifat 1: Deskripsi\n"
                "- Sifat 2: Deskripsi\n"
                "- Sifat 3: Deskripsi\n"
                "- Sifat 4: Deskripsi\n"
                "- Sifat 5: Deskripsi"
            ),
            'jp': (
                f"次の参照に基づいてキャラクターの詳細な性格プロフィールを生成してください: {reference}. "
                "以下の形式で特徴を提示してください:\n"
                "- 特徴1: 説明\n"
                "- 特徴2: 説明\n"
                "- 特徴3: 説明\n"
                "- 特徴4: 説明\n"
                "- 特徴5: 説明"
            ),
            'kr': (
                f"다음 참조 반으로 캐릭터의 상세한 성격 프로필을 생성하세요: {reference}. "
                "다음 형식으로 특성을 제시하세요:\n"
                "- 특성 1: 설명\n"
                "- 특성 2: 설명\n"
                "- 특성 3: 설명\n"
                "- 특성 4: 설명\n"
                "- 특성 5: 설명"
            ),
            'cn': (
                f"根据以下参考生成角色的详细性格档案: {reference}. "
                "请按以下格式呈现特征:\n"
                "- 特征1: 描述\n"
                "- 特征2: 描述\n"
                "- 特征3: 描述\n"
                "- 特征4: 描述\n"
                "- 特征5: 描述"
            )
        }

        formatted_prompt = prompts.get(language, prompts['en'])  # Default to English if language not found

        api_key = os.getenv('CHAI_API_KEY')
        if not api_key:
            logger.error("CHAI_API_KEY not configured")
            return jsonify({"error": "API key not configured"}), 500

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        payload = {
            "model": "chai_v3",
            "messages": [
                {"role": "system", "content": f"You are an assistant that generates personality traits in {language} language."},
                {"role": "user", "content": formatted_prompt}
            ],
            "max_tokens": 90000,
            "temperature": 0.7,
        }

        logger.info("Sending request to Chai API")
        try:
            response = requests.post(
                "https://api.chai-research.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            # Log the response for debugging
            logger.info(f"Chai API response status: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"Chai API error: {response.text}")
                return jsonify({
                    "error": f"API returned status code {response.status_code}",
                    "details": response.text
                }), response.status_code

            response_data = response.json()
            logger.info("Successfully received response from Chai API")

            generated_content = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            if not generated_content.strip():
                logger.error("Generated content is empty")
                return jsonify({"error": "Generated content is empty. Please try again."}), 500

            traits = generated_content.splitlines()
            formatted_traits = [f"{trait.strip()}" for trait in traits if trait.strip()]
            
            logger.info("Successfully formatted traits")
            return jsonify({"generatedTraits": "\n".join(formatted_traits)})

        except requests.exceptions.Timeout:
            logger.error("Request to Chai API timed out")
            return jsonify({"error": "Request timed out. Please try again."}), 504
        except requests.exceptions.RequestException as e:
            logger.error(f"Request to Chai API failed: {str(e)}")
            return jsonify({"error": "Failed to connect to AI service"}), 503

    except Exception as e:
        logger.error(f"Unexpected error in generate_traits: {str(e)}", exc_info=True)
        return jsonify({
            "error": "An unexpected error occurred",
            "details": str(e)
        }), 500