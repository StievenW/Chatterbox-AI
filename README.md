# Chatterbox AI

## Description
An AI-powered chat application built with Flask and Chai Research API that enables natural conversations with customizable AI personalities.

## Features
- Real-time chat interface
- Customizable AI personalities
- Multi-language support (EN, ID, JP, KR, CN)
- Secure API handling
- Input validation and sanitization
- Error handling and logging
- Retry mechanism for API calls

## Prerequisites
- Python 3.8 or higher
- Chai Research API key
- Modern web browser

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Chatterbox-AI.git
   cd Chatterbox-AI
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env` file in the project root.
   - Add the following lines to the `.env` file:
     ```
     CHAI_API_KEY=your_chai_api_key
     SECRET_KEY=your_secret_key_here 
     FLASK_ENV=development
     ```

5. Start the application:
   ```bash
   flask run
   ```

6. Open the application in your web browser:
   ```
   http://127.0.0.1:5000
   ```

## Usage
- Launch the app in your browser.
- Choose or create an AI personality.
- Start chatting in your preferred language.

## Development
To contribute:
1. Fork the repository.
2. Create a new branch for your feature:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes and push to your fork.
4. Create a pull request.

## Testing
Run unit tests to ensure functionality:
```bash
pytest
```

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments
- Flask documentation
- Chai Research API

Feel free to customize and enhance Chatterbox AI!
