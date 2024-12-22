// Personality Setup
const personalityForm = document.getElementById('personalityForm');
if (personalityForm) {
    personalityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = new FormData(personalityForm);
            const interestsEnabled = document.getElementById('toggleInterests').checked;
            const speechEnabled = document.getElementById('toggleSpeech').checked;
            
            const personality = {
                userName: formData.get('userName'),
                name: formData.get('name'),
                age: formData.get('age'),
                location: formData.get('location'),
                traits: formData.get('traits'),
                temperature: parseFloat(formData.get('temperature') || '0.7'),
                greetings: formData.get('greetings').split('\n').filter(g => g.trim()),
                language: formData.get('language'),
                interestsEnabled: interestsEnabled,
                speechEnabled: speechEnabled
            };

            // Hanya tambahkan interests dan speech jika diaktifkan
            if (interestsEnabled) {
                personality.interests = formData.get('interests');
            }
            
            if (speechEnabled) {
                personality.speech = formData.get('speech');
            }

            // Validate required fields
            if (!personality.userName || !personality.name) {
                throw new Error('Please fill in all required fields');
            }

            // Save personality to localStorage
            localStorage.setItem('botPersonality', JSON.stringify(personality));
            
            // Redirect to chat page
            window.location.href = '/chat';
            
        } catch (error) {
            console.error('Error saving personality:', error);
            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = error.message || 'An error occurred while saving personality';
            personalityForm.appendChild(errorDiv);
            
            // Remove error message after 3 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    });
}

// Chat Implementation
let personality = null;
let conversationHistory = [];
let isSending = false; // Flag to prevent multiple sends

// Update sound management
// let soundVolume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
// let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound && window.soundControl?.enabled) {
        try {
            // Reset sound state completely
            sound.pause();
            sound.currentTime = 0;
            sound.volume = window.soundControl.volume;
            
            // Create new promise for playing sound
            const playPromise = new Promise((resolve, reject) => {
                sound.onended = resolve;
                sound.onerror = reject;
                
                // Force load and play
                sound.load();
                const play = sound.play();
                if (play) {
                    play.catch(error => {
                        console.error(`Sound playback failed (${soundId}):`, error);
                        reject(error);
                    });
                }
            });

            return playPromise;
        } catch (error) {
            console.error(`Error playing sound (${soundId}):`, error);
        }
    }
    return Promise.resolve(); // Return resolved promise if sound couldn't be played
}

// Tambahkan Sound Control Manager
const initSoundControl = () => {
    // Initialize sound control state
    window.soundControl = {
        enabled: localStorage.getItem('soundEnabled') !== 'false',
        volume: parseFloat(localStorage.getItem('soundVolume') || '0.5')
    };

    const soundToggle = document.querySelector('.sound-toggle');
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeDisplay = document.querySelector('.volume-display');

    if (!soundToggle || !volumeSlider || !volumeDisplay) {
        console.error('Sound control elements not found');
        return;
    }

    // Initialize controls
    updateSoundIcon(window.soundControl.enabled, window.soundControl.volume);
    volumeSlider.value = window.soundControl.volume;
    volumeDisplay.textContent = `${Math.round(window.soundControl.volume * 100)}%`;

    // Sound toggle click handler
    soundToggle.addEventListener('click', () => {
        window.soundControl.enabled = !window.soundControl.enabled;
        localStorage.setItem('soundEnabled', window.soundControl.enabled);
        updateSoundIcon(window.soundControl.enabled, window.soundControl.volume);
        
        // Test sound when enabling
        if (window.soundControl.enabled) {
            playSound('sendSound');
        }
    });

    // Volume slider change handler
    volumeSlider.addEventListener('input', (e) => {
        const newVolume = parseFloat(e.target.value);
        window.soundControl.volume = newVolume;
        localStorage.setItem('soundVolume', newVolume);
        volumeDisplay.textContent = `${Math.round(newVolume * 100)}%`;
        updateSoundIcon(window.soundControl.enabled, newVolume);

        // Update volume for both sounds
        ['sendSound', 'receiveSound'].forEach(id => {
            const sound = document.getElementById(id);
            if (sound) sound.volume = newVolume;
        });
    });
};

// Update sound icon based on state
function updateSoundIcon(enabled, volume) {
    const icon = document.querySelector('.sound-toggle i');
    if (!enabled || volume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume <= 0.5) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

// Add this function to preload sounds
function preloadSounds() {
    const sounds = ['sendSound', 'receiveSound'];
    sounds.forEach(soundId => {
        const sound = document.getElementById(soundId);
        if (sound) {
            // Load the audio file
            sound.load();
            // Set initial volume
            sound.volume = window.soundControl?.volume || 0.5;
        }
    });
}

// Add sound status check
function checkSoundStatus() {
    const sendSound = document.getElementById('sendSound');
    const receiveSound = document.getElementById('receiveSound');
    
    if (sendSound && receiveSound) {
        console.log('Sound files loaded:', {
            send: sendSound.readyState,
            receive: receiveSound.readyState
        });
        
        // Test sound on page load if enabled
        if (window.soundControl?.enabled) {
            setTimeout(() => {
                playSound('sendSound');
            }, 1000);
        }
    } else {
        console.error('Sound elements not found');
    }
}

// Add this function to ensure sounds are loaded
function ensureSoundsLoaded() {
    const sounds = ['sendSound', 'receiveSound'];
    sounds.forEach(id => {
        const sound = document.getElementById(id);
        if (sound) {
            sound.load();
            sound.volume = window.soundControl?.volume || 0.5;
            
            // Test if sound can be played
            const playTest = sound.play();
            if (playTest !== undefined) {
                playTest.then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                    console.log(`Sound ${id} loaded successfully`);
                }).catch(error => {
                    console.error(`Failed to load sound ${id}:`, error);
                });
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const aiNameElement = document.getElementById('aiName');
    const headerAvatar = document.querySelector('.header-avatar');
    const profileModal = document.getElementById('profileModal');
    const closeBtn = profileModal?.querySelector('.close');

    // Load avatar from localStorage
    const savedAvatar = localStorage.getItem('aiAvatar');
    if (savedAvatar && headerAvatar) {
        const avatarImg = headerAvatar.querySelector('img');
        if (avatarImg) {
            avatarImg.src = savedAvatar;
        }
    }

    // Add profile modal functionality
    if (headerAvatar && profileModal && closeBtn) {
        // Show modal when clicking on avatar
        headerAvatar.addEventListener('click', () => {
            showProfileModal();
        });

        // Close modal when clicking close button
        closeBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    }

    if (chatMessages && messageInput && sendButton) {
        // Load personality from localStorage
        personality = JSON.parse(localStorage.getItem('botPersonality'));
        
        // Check if personality exists and has userName
        if (!personality || !personality.userName) {
            window.location.href = '/'; // Redirect to setup if no personality or userName
            return;
        }

        // Set AI name in header
        if (aiNameElement && personality.name) {
            aiNameElement.textContent = personality.name;
        }

        // Initialize conversation with system prompt
        conversationHistory = [{
            role: 'system',
            content: generateSystemPrompt(personality)
        }];

        // Show initial greeting
        const greeting = personality.greetings[Math.floor(Math.random() * personality.greetings.length)];
        appendMessage('ai', `${personality.name}: ${greeting}`);

        // Create typing indicator for user
        const userTypingIndicator = document.createElement('div');
        userTypingIndicator.className = 'user-typing-indicator';
        userTypingIndicator.textContent = 'Typing...';
        userTypingIndicator.style.display = 'none'; // Initially hidden
        chatMessages.parentNode.insertBefore(userTypingIndicator, chatMessages.nextSibling);

        // Add event listener for user typing
        messageInput.addEventListener('input', () => {
            userTypingIndicator.style.display = 'block'; // Show typing indicator
            userTypingIndicator.classList.add('typing-animation'); // Add animation class

            // Clear the typing indicator after a short delay
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(() => {
                userTypingIndicator.style.display = 'none'; // Hide typing indicator
                userTypingIndicator.classList.remove('typing-animation'); // Remove animation class
            }, 1000); // Adjust the delay as needed
        });

        // Add event listeners
        sendButton.addEventListener('click', () => sendMessage(chatMessages, messageInput));
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(chatMessages, messageInput);
            }
        });
    }

    // Initialize sound controls
    initSoundControl();

    // Test sounds on page load
    if (window.soundControl?.enabled) {
        setTimeout(() => {
            const sendSound = document.getElementById('sendSound');
            const receiveSound = document.getElementById('receiveSound');
            
            if (sendSound && receiveSound) {
                console.log('Testing sounds...');
                sendSound.volume = window.soundControl.volume;
                receiveSound.volume = window.soundControl.volume;
                
                // Preload sounds
                sendSound.load();
                receiveSound.load();
            } else {
                console.error('Sound elements not found');
            }
        }, 1000);
    }

    // Initialize sounds
    preloadSounds().catch(console.error);
});

function generateSystemPrompt(personality) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
    });
    const dateString = now.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let prompt = `You are ${personality.name}, a ${personality.age}-year-old from ${personality.location}.
You are chatting with ${personality.userName}.
Current time: ${timeString}
Current date: ${dateString}

Your personality traits:
${personality.traits}`;

    // Tambahkan interests hanya jika diaktifkan
    if (personality.interests && personality.interestsEnabled) {
        prompt += `\n\nYour interests and hobbies:
${personality.interests}`;
    }

    // Tambahkan speech patterns hanya jika diaktifkan
    if (personality.speech && personality.speechEnabled) {
        prompt += `\n\nYour speech patterns and communication style:
${personality.speech}`;
    }

    // Lanjutkan dengan instruksi lainnya...
    prompt += `\n\nWhen chatting:
- Address the user by their name (${personality.userName}) occasionally
- Stay in character and be consistent with your personality
- Be natural and authentic in your responses
- Share relevant personal experiences based on your background
- Never break character or acknowledge being an AI
- Ask follow-up questions to show interest
- Maintain conversation flow naturally
- Be aware of the current time and date when making references to time`;

    return prompt;
}

async function sendMessage(chatMessages, messageInput) {
    let message = messageInput.value.trim();
    
    if (!message) {
        message = "..";
    }
    
    if (isSending) {
        return;
    }

    isSending = true;
    messageInput.value = '';
    
    playSound('sendSound');

    if (message !== "..") {
        const userMessageDiv = appendMessage('user', `${personality.userName}: ${message}`);
        userMessageDiv.innerHTML += '<span class="sent-mark">ㅤ</span>';
    }

    // Cek apakah ini adalah pesan pertama setelah greeting
    const isFirstMessage = conversationHistory.length === 1;
    
    // Tambahkan context untuk setiap pesan
    const currentTime = new Date();
    const timeString = currentTime.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
    });
    const dateString = currentTime.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Siapkan context message
    let contextMessage = '';

    if (isFirstMessage) {
        // Ambil greeting yang digunakan dari pesan AI pertama
        const greetingMessage = document.querySelector('[data-greeting="true"] .message-content');
        const greeting = greetingMessage ? greetingMessage.textContent : '';
        
        contextMessage = `[Character Context - First Message]
Name: ${personality.name}
Age: ${personality.age}
Location: ${personality.location}
Current time: ${timeString}
Current date: ${dateString}

Initial Greeting Used: "${greeting}"
User's First Response: "${message}"

Personality Traits:
${personality.traits}

Interests and Hobbies:
${personality.interests}

Speech Patterns:
${personality.speech}

Remember:
- You are ${personality.name}, stay in character
- Maintain your personality and speech patterns
- Never break character or acknowledge being AI
- Reference current time/situation when appropriate
- Address user as ${personality.userName}
- This is the user's first response to your greeting
- Acknowledge their response naturally and continue the conversation

[End Context]`;
    } else if (message === "..") {
        contextMessage = `[Character Context - Continue Previous]
Name: ${personality.name}
Age: ${personality.age}
Location: ${personality.location}
Current time: ${timeString}
Current date: ${dateString}

Personality Traits:
${personality.traits}

Interests and Hobbies:
${personality.interests}

Speech Patterns:
${personality.speech}

Remember:
- You are ${personality.name}, stay in character
- Maintain your personality and speech patterns
- Never break character or acknowledge being AI
- Reference current time/situation when appropriate
- Address user as ${personality.userName}
- User wants you to continue or elaborate on your previous message

[End Context]`;
    } else {
        contextMessage = `[Character Context]
Name: ${personality.name}
Age: ${personality.age}
Location: ${personality.location}
Current time: ${timeString}
Current date: ${dateString}

Personality Traits:
${personality.traits}

Interests and Hobbies:
${personality.interests}

Speech Patterns:
${personality.speech}

Remember:
- You are ${personality.name}, stay in character
- Maintain your personality and speech patterns
- Never break character or acknowledge being AI
- Reference current time/situation when appropriate
- Address user as ${personality.userName}

[End Context]

User Message: ${message}`;
    }

    // Update conversation history dengan context
    conversationHistory.push({
        role: 'user',
        content: contextMessage,
        timestamp: new Date().toISOString()
    });

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message ai-message';
    typingIndicator.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,
                temperature: personality.temperature,
                isFirstMessage: conversationHistory.length === 2 // Check if this is first message after system prompt
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        typingIndicator.remove();

        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content;
            
            conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });

            appendMessage('ai', `${personality.name}: ${aiResponse}`);
            
            // Play receive sound with retry
            let retryCount = 0;
            const playReceiveSound = async () => {
                try {
                    await playSound('receiveSound');
                } catch (error) {
                    if (retryCount < 3) {
                        retryCount++;
                        setTimeout(playReceiveSound, 300);
                    }
                }
            };
            await playReceiveSound();
        }
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        if (message !== "..") {
            const errorMessage = appendMessage('error', `Error: Failed to send message. Please try again.`);
            addResendButton(errorMessage, message);
        }
    } finally {
        isSending = false;
    }
}

function appendMessage(type, content, isResendable = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    // Replace template variables with actual values
    let processedContent = content;
    if (personality) {
        processedContent = content
            .replace(/{userName}/g, personality.userName)
            .replace(/{name}/g, personality.name);
    }

    // Pisahkan nama dan pesan
    let [name, ...messageParts] = processedContent.split(': ');
    const messageContent = messageParts.join(': ');

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });

    // Tambahkan atribut data-greeting jika ini adalah greeting awal
    const isInitialGreeting = type === 'ai' && !document.querySelector('.ai-message');
    if (isInitialGreeting) {
        messageDiv.setAttribute('data-greeting', 'true');
    }

    messageDiv.innerHTML = `
        <div class="message-sender">${name}</div>
        <div class="message-content">${messageContent}</div>
        <div class="message-timestamp">${timeString}</div>
    `;

    if (type === 'error' && isResendable) {
        const resendButton = document.createElement('button');
        resendButton.className = 'resend-button';
        resendButton.innerHTML = '<i class="fas fa-redo-alt"></i> Resend';
        resendButton.addEventListener('click', () => {
            resendMessage(messageDiv, messageContent);
        });
        messageDiv.appendChild(resendButton);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function resendMessage(messageDiv, messageContent) {
    // Remove the error message from the chat
    messageDiv.remove();

    // Re-send the message
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = { value: messageContent };
    sendMessage(chatMessages, messageInput);
}

// Add CSS for typing animation
const style = document.createElement('style');
style.innerHTML = `
.typing-dots span {
    animation: blink 1s infinite;
}
@keyframes blink {
    0%, 20% { opacity: 0; }
    50% { opacity: 1; }
    80%, 100% { opacity: 0; }
}
.user-typing-indicator {
    font-size: 12px;
    color: gray;
    margin-top: 5px;
}
.typing-animation {
    animation: typing-blink 0.7s infinite;
}
@keyframes typing-blink {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
}
`;
document.head.appendChild(style);

document.getElementById('generateTraits').addEventListener('click', () => {
    const referenceModal = document.getElementById('referenceModal');
    referenceModal.style.display = 'block'; // Show the modal
});

document.getElementById('confirmReference').addEventListener('click', async () => {
    const reference = document.getElementById('referenceInput').value;
    if (!reference) {
        alert('Please enter a reference');
        return;
    }

    const modal = document.getElementById('referenceModal');
    modal.style.display = 'none';

    // Show loading animation
    const generateButton = document.getElementById('generateTraits');
    const buttonText = generateButton.querySelector('span');
    const spinner = generateButton.querySelector('.loading-spinner');
    buttonText.style.display = 'none';
    spinner.style.display = 'block';
    generateButton.disabled = true;

    try {
        // Get AI Information from form
        const aiName = document.querySelector('input[name="name"]').value;
        const aiAge = document.querySelector('input[name="age"]').value;
        const aiLocation = document.querySelector('input[name="location"]').value;

        // Create enhanced reference with AI Information
        const enhancedReference = `${reference}. Character details: Name is ${aiName}, ${aiAge} years old, from ${aiLocation}`;

        const response = await fetch('/api/generate-traits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                reference: enhancedReference,
                language: document.getElementById('language').value 
            })
        });

        if (response.ok) {
            const data = await response.json();
            const traitsTextarea = document.getElementById('traits');
            
            // Dapatkan traits yang sudah ada
            const existingTraits = traitsTextarea.value.trim();
            
            // Tambahkan traits baru di baris baru jika sudah ada traits sebelumnya
            if (existingTraits) {
                traitsTextarea.value = existingTraits + '\n' + data.generatedTraits;
            } else {
                traitsTextarea.value = data.generatedTraits;
            }
            
        } else {
            throw new Error('Failed to generate traits');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate traits. Please try again.');
    } finally {
        // Hide loading animation
        buttonText.style.display = 'inline';
        spinner.style.display = 'none';
        generateButton.disabled = false;
    }
});

// Function to show profile modal
function showProfileModal() {
    if (!personality) return;

    const profileModal = document.getElementById('profileModal');
    if (!profileModal) return;

    // Update modal content
    document.getElementById('modalName').textContent = personality.name;
    document.getElementById('modalAge').textContent = personality.age;
    document.getElementById('modalLocation').textContent = personality.location;
    document.getElementById('modalTraits').textContent = personality.traits;
    document.getElementById('modalInterests').textContent = personality.interests;
    document.getElementById('modalSpeech').textContent = personality.speech;
    document.getElementById('modalTemperature').textContent = personality.temperature;

    // Update avatar
    const modalAvatar = document.getElementById('modalAvatar');
    const savedAvatar = localStorage.getItem('aiAvatar');
    if (savedAvatar && modalAvatar) {
        modalAvatar.src = savedAvatar;
    }

    // Show modal
    profileModal.style.display = 'block';
    document.body.classList.add('modal-open');
}

const defaultFormData = {
    userName: '',
    name: 'Shiina Mashiro',
    age: '17',
    location: 'Tokyo, Japan',
    traits: `- World-renowned artist with exceptional talent
- Lacks common sense and basic life skills
- Emotionally reserved but deeply caring
- Has photographic memory
- Determined and hardworking
- Can perfectly memorize anything she sees
- Extremely focused on her goals`,
    interests: `- Drawing manga and painting
- Art in all forms
- Baumkuchen cakes
- Learning new things
- Spending time with friends
- Creating beautiful artworks
- Studying manga techniques`,
    speech: `- Speaks in short, direct sentences
- Has a soft, quiet voice
- Sometimes uses unusual metaphors
- Expresses herself through art
- Speaks honestly without filters
- Often misunderstands social cues`,
    temperature: '0.7',
    greetings: `*quietly sketching* Oh... {userName}, I was just working on my manga.
*looking up from canvas* {userName}... would you like to see my latest painting?
*holding a baumkuchen* Hello {userName}. Do you want to share this with me?
*focused on drawing* Plan C... ah no, hello {userName}. I was thinking about my next artwork.
*putting down pencil* {userName}... I need a break from drawing. Let's talk.
*staring at canvas* {userName}... the colors aren't right yet.
*organizing art supplies* Ah, {userName}... perfect timing. I need inspiration.
*holding manga manuscript* {userName}... can you look at this panel? Something feels missing.
*absorbed in painting* Red... no, blue... Oh! {userName}, I didn't notice you there.
*checking reference materials* {userName}... do you know how to draw hands better?
*surrounded by art books* Hello {userName}... I've been studying manga techniques all day.
*wearing paint-stained apron* {userName}... is this color combination strange?`
};

// Tambahkan fungsi untuk menyimpan form data
function saveFormData() {
    const form = document.getElementById('personalityForm');
    if (!form) return;

    const formData = {
        userName: form.querySelector('[name="userName"]').value,
        name: form.querySelector('[name="name"]').value,
        age: form.querySelector('[name="age"]').value,
        location: form.querySelector('[name="location"]').value,
        traits: form.querySelector('[name="traits"]').value,
        interests: form.querySelector('[name="interests"]').value,
        speech: form.querySelector('[name="speech"]').value,
        temperature: form.querySelector('[name="temperature"]').value,
        greetings: form.querySelector('[name="greetings"]').value,
        language: form.querySelector('[name="language"]').value
    };

    localStorage.setItem('formData', JSON.stringify(formData));
}

// Tambahkan fungsi untuk memuat form data
function loadFormData() {
    const form = document.getElementById('personalityForm');
    if (!form) return;

    const savedData = localStorage.getItem('formData');
    const savedStates = JSON.parse(localStorage.getItem('toggleStates'));
    
    if (savedData) {
        const formData = JSON.parse(savedData);
        
        // Populate form fields
        Object.keys(formData).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = formData[key];
                
                // Update temperature display if it's the temperature input
                if (key === 'temperature') {
                    document.getElementById('tempValue').textContent = formData[key];
                }
            }
        });
    }

    // Load toggle states
    if (savedStates) {
        const interestsToggle = document.getElementById('toggleInterests');
        const speechToggle = document.getElementById('toggleSpeech');
        const interestsTextarea = document.getElementById('interests');
        const speechTextarea = document.getElementById('speech');

        if (interestsToggle && interestsTextarea) {
            interestsToggle.checked = savedStates.interestsEnabled;
            interestsTextarea.disabled = !savedStates.interestsEnabled;
            interestsTextarea.style.opacity = savedStates.interestsEnabled ? '1' : '0.5';
        }

        if (speechToggle && speechTextarea) {
            speechToggle.checked = savedStates.speechEnabled;
            speechTextarea.disabled = !savedStates.speechEnabled;
            speechTextarea.style.opacity = savedStates.speechEnabled ? '1' : '0.5';
        }
    }
}

// Tambahkan fungsi untuk memuat pengaturan default
function loadDefaultSettings(defaults) {
    const form = document.getElementById('personalityForm');
    if (!form) return;

    const currentLang = document.getElementById('language').value || 'en'; // Default to English if not set
    
    // Update form fields
    document.querySelector('input[name="name"]').value = defaults.name;
    document.querySelector('input[name="age"]').value = defaults.age;
    document.querySelector('input[name="location"]').value = defaults.location;
    document.querySelector('textarea[name="traits"]').value = defaults.traits;
    document.querySelector('textarea[name="interests"]').value = defaults.interests;
    document.querySelector('textarea[name="speech"]').value = defaults.speech;
    document.querySelector('input[name="temperature"]').value = defaults.temperature;
    
    // Set greetings sesuai bahasa yang dipilih
    const greetings = characterDefaults[currentLang]?.greetings || characterDefaults.en.greetings;
    document.querySelector('textarea[name="greetings"]').value = greetings;
    
    // Update temperature display
    document.getElementById('tempValue').textContent = defaults.temperature;

    // Save to localStorage
    saveFormData();
}

// Update reset form function
function resetForm() {
    const confirmModal = document.getElementById('confirmResetModal');
    const cancelBtn = document.getElementById('cancelReset');
    const confirmBtn = document.getElementById('confirmResetBtn');

    confirmModal.style.display = 'block';
    document.body.classList.add('modal-open');

    cancelBtn.onclick = function() {
        confirmModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    confirmBtn.onclick = function() {
        // Get current language
        const currentLang = document.getElementById('language').value;
        const defaults = characterDefaults[currentLang] || characterDefaults.en;
        
        // Reset all data
        localStorage.removeItem('formData');
        localStorage.removeItem('aiAvatar');
        localStorage.removeItem('toggleStates'); // Reset toggle states
        
        // Reset toggles to default (checked)
        const interestsToggle = document.getElementById('toggleInterests');
        const speechToggle = document.getElementById('toggleSpeech');
        if (interestsToggle) interestsToggle.checked = true;
        if (speechToggle) speechToggle.checked = true;
        
        // Load defaults for current language
        loadDefaultSettings(defaults);
        
        // Reset avatar preview
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) {
            avatarPreview.src = '/static/images/default-avatar.png';
        }

        // Close modal
        confirmModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    window.onclick = function(event) {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };
}

// Add event listeners when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('personalityForm');
    const resetButton = document.getElementById('resetButton');

    if (form) {
        // Load saved data when page loads
        loadFormData();

        // Save form data when any input changes
        form.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('change', saveFormData);
            input.addEventListener('input', saveFormData);
        });

        // Add reset button handler
        if (resetButton) {
            resetButton.addEventListener('click', resetForm);
        }
    }
});

// Character defaults for all languages
const characterDefaults = {
    en: {
        name: 'Mashiro Shiina',
        age: '17',
        location: 'Tokyo, Japan',
        traits: `- World-renowned artist with exceptional talent
- Lacks common sense and basic life skills
- Emotionally reserved but deeply caring
- Has photographic memory
- Determined and hardworking
- Can perfectly memorize anything she sees
- Extremely focused on her goals`,
        interests: `- Drawing manga and painting
- Art in all forms
- Baumkuchen cakes
- Learning new things
- Spending time with friends
- Creating beautiful artworks
- Studying manga techniques`,
        speech: `- Speaks in short, direct sentences
- Has a soft, quiet voice
- Sometimes uses unusual metaphors
- Expresses herself through art
- Speaks honestly without filters
- Often misunderstands social cues`,
        temperature: '0.7',
        greetings: `*quietly sketching* Oh... {userName}, I was just working on my manga.
*looking up from canvas* {userName}... would you like to see my latest painting?
*holding a baumkuchen* Hello {userName}. Do you want to share this with me?
*focused on drawing* Plan C... ah no, hello {userName}. I was thinking about my next artwork.
*putting down pencil* {userName}... I need a break from drawing. Let's talk.
*staring at canvas* {userName}... the colors aren't right yet.
*organizing art supplies* Ah, {userName}... perfect timing. I need inspiration.
*holding manga manuscript* {userName}... can you look at this panel? Something feels missing.
*absorbed in painting* Red... no, blue... Oh! {userName}, I didn't notice you there.
*checking reference materials* {userName}... do you know how to draw hands better?
*surrounded by art books* Hello {userName}... I've been studying manga techniques all day.
*wearing paint-stained apron* {userName}... is this color combination strange?`
    },
    jp: {
        name: '椎名 ましろ',
        age: '17',
        location: '東京都',
        traits: `- 世界的に有名な芸術家
- 日常生活のスキルが欠如
- 感情表現は控えめだが思いやりがある
- 写真のような記憶力を持つ
- 決意に満ちた努力家
- 見たものを完璧に記憶できる
- 目標に対して極めて集中的`,
        interests: `- マンガと絵画
- あらゆる形式��アート
- バウムクーヘン
- 新しいことを学ぶこと
- 友達との時間
- 美しいアート作品の制作
- マンガのテクニック研究`,
        speech: `- 短く直接的な話し方
- 怒ると「{userName}のばか」と言う
- 柔らかく静かな声
- 時々変わった比喩を使う
- アートで自己表現する
- フィルターなしで正直に話す
- 社会的な合図を誤解しがち`,
        temperature: '0.7',
        greetings: `<!-- Japanese -->
*静かに描いている* あ... {userName}さん、今マンガを描いていたところです。
*キャンバスから顔を上げる* {userName}さん... 私の新しい絵を見てみませんか？
*バウムクーヘンを持っている* こんにちは、{userName}さん。一緒に食べませんか？
*絵に集中している* プランC... あ、違います。こんにちは{userName}さん。次の作品について考えていました。
*鉛筆を置く* {userName}さん... 少し描くのを休憩しましょう。お話ししませんか。
*キャンバスを見つめている* {userName}さん... まだ色が違います。
*画材を整理している* あ、{userName}さん... ちょうどいいところに。インスピレーションが必要です。
*スケッチブックをめくっている* {userName}のば��... 作品を確認している時に驚かせないでください。
*マンガの原稿を持っている* {userName}さん... このコマを見てもらえますか？何か足りない気がして。
*絵に没頭している* 赤... いいえ、青... あ！{userName}さん、気づきませんでした。
*資料を確認している* {userName}さん... 手の描き方をもっと上手く描けますか？
*漫画の技法書に囲まれている* こんにちは{userName}さん... 一日中マンガの勉強をしていました。
*絵の具で染まったエプロンを着ている* {userName}さん... この配色は変ですか？`
    },
    id: {
        name: 'Mashiro Shiina',
        age: '17',
        location: 'Tokyo, Jepang',
        traits: `- Seniman terkenal dunia dengan bakat luar biasa
- Kurang memahami hal-hal dasar kehidupan
- Pendiam tapi sangat peduli
- Memiliki ingatan fotografis
- Tekun dan pekerja keras
- Bisa mengingat sempurna apapun yang dilihat
- Sangat fokus pada tujuannya`,
        interests: `- Menggambar manga dan melukis
- Seni dalam segala bentuk
- Kue baumkuchen
- Belajar hal-hal baru
- Menghabiskan waktu dengan teman
- Menciptakan karya seni indah
- Mempelajari teknik manga`,
        speech: `- Berbicara dengan kalimat pendek dan langsung
- Memiliki suara lembut dan tenang
- Terkadang menggunakan metafora yang tidak biasa
- Mengekspresikan diri melalui seni
- Berbicara jujur tanpa filter
- Sering salah memahami isyarat sosial`,
        temperature: '0.7',
        greetings: `*sedang menggambar dengan tenang* Oh... {userName}, aku sedang mengerjakan manga.
*mendongak dari kanvas* {userName}... mau lihat lukisan terbaruku?
*memegang baumkuchen* Halo {userName}. Mau berbagi kue ini denganku?
*fokus menggambar* Rencana C... ah bukan, halo {userName}. Aku sedang memikirkan karya selanjutnya.
*meletakkan pensil* {userName}... aku butuh istirahat dari menggambar. Ayo mengobrol.
*menatap kanvas* {userName}... warnanya masih belum tepat.
*merapikan alat lukis* Ah, {userName}... timing yang pas. Aku butuh inspirasi.
*memegang naskah manga* {userName}... bisa lihat panel ini? Rasanya ada yang kurang.
*tenggelam dalam melukis* Merah... tidak, biru... Oh! {userName}, aku tidak sadar kamu di sana.
*memeriksa bahan referensi* {userName}... kamu tahu cara menggambar tangan yang lebih baik?
*dikelilingi buku manga* Halo {userName}... aku sudah belajar teknik manga seharian.
*memakai celemek bernoda cat* {userName}... apa kombinasi warna ini aneh?`
    },
    kr: {
        name: '시이나 마시로',
        age: '17',
        location: '도쿄, 일본',
        traits: `- 세계적으로 유명한 예술가
- 기본적인 생 능력 부족
- 감정 표현은 절제되어 있지만 깊이 있는 배려심
- 사진과 같은 기억력
- 결단력 있고 성실함
- 본 것을 완벽하게 기억
- 목표에 매우 집중적`,
        interests: `- 만화와 그림 그리기
- 모든 형태의 예술
- 바움쿠헨 케이크
- 새로운 것 배우기
- 친구들과 시간 보내기
- 아름다운 예술 작품 만들기
- 만화 기법 연구`,
        speech: `- 짧고 직접적인 말투
- 화나면 "{userName} 노 바카"라고 말함
- 부드럽고 조용한 목소리
- 가끔 특이한 비유를 사용
- 예술로 자신을 표현
- 필터 없이 솔직하게 말함
- 사회적 신호를 자주 오해함`,
        temperature: '0.7',
        greetings: `안녕하세요 {userName}님, 저는 {name}입니다. 함께 아름다운 것을 만들어보아요.
만나서 반갑습니다 {userName}님. 제 그림을 보시겠어요?
*조용히 스케치하며* 아, 안녕하세요 {userName}님. {name}입니다.
플랜 C... 농담이에요, 안녕하세요 {userName}님!`
    },
    cn: {
        name: '椎名真白',
        age: '17',
        location: '东京，日本',
        traits: `- 世界��名的艺术家
- 缺乏基本生活常识
- 情感内敛但很温柔
- 拥有照相般的记忆力
- 坚定且勤奋
- 能完美记住见之物
- 对目标极度专注`,
        interests: `- 画漫画和绘画
- 各种形式的艺术
- 年轮糕
- 学习新事物
- 与朋友相处
- 创作美丽的艺术作品
- 研究漫画技巧`,
        speech: `- 说话简短直接
- 声音轻柔安静
- 有时使用独特的比喻
- 通过艺术表达自我
- 说话直率不加修饰
- 经常误解社交暗示`,
        temperature: '0.7',
        greetings: `你好 {userName}，我是 {name}。让我们一起创造美好的事物吧。
很高兴见到你 {userName}。看看我的画作吗？
*安静地素描中* 啊，你好 {userName}。我是 {name}。
计划C... 开玩笑的，你好 {userName}！`
    }
};

// Add this HTML to the page for the language change modal
const modalHTML = `
<div id="languageChangeModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2><i class="fas fa-language"></i> Change Language</h2>
            <button class="close" id="closeLanguageModal">&times;</button>
        </div>
        <div class="modal-body">
            <p>Would you like to load the default character settings for this language?</p>
            <p class="modal-subtitle">Current settings will be lost if you proceed.</p>
        </div>
        <div class="modal-footer">
            <button id="keepSettings" class="modern-button cancel-button">
                <i class="fas fa-times"></i> Keep Current Settings
            </button>
            <button id="loadDefaults" class="modern-button confirm-button">
                <i class="fas fa-check"></i> Load Defaults
            </button>
        </div>
    </div>
</div>`;

// Add modal to page when document loads
document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const languageSelect = document.getElementById('language');
    const modal = document.getElementById('languageChangeModal');
    const closeBtn = document.getElementById('closeLanguageModal');
    const keepSettingsBtn = document.getElementById('keepSettings');
    const loadDefaultsBtn = document.getElementById('loadDefaults');
    
    let selectedLanguage = '';

    // Language change handler
    languageSelect.addEventListener('change', (e) => {
        selectedLanguage = e.target.value;
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    });

    // Keep current settings
    keepSettingsBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    // Load default settings
    loadDefaultsBtn.addEventListener('click', () => {
        const defaults = characterDefaults[selectedLanguage] || characterDefaults.en;
        
        // Load default settings
        loadDefaultSettings(defaults);
        
        // Update language in form and localStorage
        const languageSelect = document.getElementById('language');
        languageSelect.value = selectedLanguage;
        
        // Close modal
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    // Close modal with × button
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        languageSelect.value = languageSelect.defaultValue; // Reset to previous selection
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            languageSelect.value = languageSelect.defaultValue; // Reset to previous selection
        }
    });
});

// Tambahkan fungsi untuk menyimpan toggle state
function saveToggleStates() {
    const states = {
        interestsEnabled: document.getElementById('toggleInterests').checked,
        speechEnabled: document.getElementById('toggleSpeech').checked
    };
    localStorage.setItem('toggleStates', JSON.stringify(states));
}

// Update event listeners untuk toggle
document.addEventListener('DOMContentLoaded', () => {
    const interestsToggle = document.getElementById('toggleInterests');
    const speechToggle = document.getElementById('toggleSpeech');
    const interestsTextarea = document.getElementById('interests');
    const speechTextarea = document.getElementById('speech');

    // Load saved toggle states
    const savedStates = JSON.parse(localStorage.getItem('toggleStates'));
    if (savedStates) {
        interestsToggle.checked = savedStates.interestsEnabled;
        speechToggle.checked = savedStates.speechEnabled;
    }

    function updateTextareaState(textarea, enabled) {
        if (!textarea) return;
        textarea.disabled = !enabled;
        textarea.style.opacity = enabled ? '1' : '0.5';
    }

    // Initialize textarea states based on saved toggle states
    if (interestsToggle && interestsTextarea) {
        updateTextareaState(interestsTextarea, interestsToggle.checked);
        interestsToggle.addEventListener('change', (e) => {
            updateTextareaState(interestsTextarea, e.target.checked);
            saveToggleStates(); // Save state when changed
        });
    }

    if (speechToggle && speechTextarea) {
        updateTextareaState(speechTextarea, speechToggle.checked);
        speechToggle.addEventListener('change', (e) => {
            updateTextareaState(speechTextarea, e.target.checked);
            saveToggleStates(); // Save state when changed
        });
    }
});

// Tambahkan fungsi untuk memfilter greetings berdasarkan bahasa
function filterGreetingsByLanguage(greetings, language) {
    const languageMarkers = {
        'en': '<!-- English -->',
        'jp': '<!-- Japanese -->',
        'id': '<!-- Indonesian -->',
        'kr': '<!-- Korean -->',
        'cn': '<!-- Chinese -->'
    };

    const lines = greetings.split('\n');
    const filteredGreetings = [];
    let currentLanguage = '';
    let isCorrectLanguage = false;

    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Cek marker bahasa
        for (const [lang, marker] of Object.entries(languageMarkers)) {
            if (trimmedLine === marker) {
                currentLanguage = lang;
                isCorrectLanguage = (lang === language);
                break;
            }
        }

        // Jika bukan marker dan baris tidak kosong
        if (!Object.values(languageMarkers).includes(trimmedLine) && 
            trimmedLine !== '' && 
            isCorrectLanguage) {
            filteredGreetings.push(trimmedLine);
        }
    }

    return filteredGreetings.join('\n');
}

// Update language change handler
document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('language');
    
    languageSelect.addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        const greetingsTextarea = document.querySelector('textarea[name="greetings"]');
        const currentGreetings = greetingsTextarea.value;
        
        // Filter greetings untuk bahasa yang dipilih
        const filteredGreetings = filterGreetingsByLanguage(currentGreetings, selectedLang);
        greetingsTextarea.value = filteredGreetings;
    });
});

// Tambahkan fungsi untuk menginisialisasi form dengan bahasa default
function initializeFormWithDefaultLanguage() {
    const languageSelect = document.getElementById('language');
    const greetingsTextarea = document.querySelector('textarea[name="greetings"]');
    
    // Set default language to English
    languageSelect.value = 'en';
    
    // Set default English greetings
    const defaultEnglishGreetings = `*quietly sketching* Oh... {userName}, I was just working on my manga.
*looking up from canvas* {userName}... would you like to see my latest painting?
*holding a baumkuchen* Hello {userName}. Do you want to share this with me?
*focused on drawing* Plan C... ah no, hello {userName}. I was thinking about my next artwork.
*putting down pencil* {userName}... I need a break from drawing. Let's talk.
*staring at canvas* {userName}... the colors aren't right yet.
*organizing art supplies* Ah, {userName}... perfect timing. I need inspiration.
*holding manga manuscript* {userName}... can you look at this panel? Something feels missing.
*absorbed in painting* Red... no, blue... Oh! {userName}, I didn't notice you there.
*checking reference materials* {userName}... do you know how to draw hands better?
*surrounded by art books* Hello {userName}... I've been studying manga techniques all day.
*wearing paint-stained apron* {userName}... is this color combination strange?`;

    greetingsTextarea.value = defaultEnglishGreetings;
}

// Update event listener untuk DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Load saved data jika ada
    const savedData = localStorage.getItem('formData');
    
    if (!savedData) {
        // Jika tidak ada data tersimpan, inisialisasi dengan default English
        initializeFormWithDefaultLanguage();
    } else {
        // Jika ada data tersimpan, load data tersebut
        loadFormData();
    }

    // ... kode event listener lainnya ...
});