// Di dalam event listener untuk form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    messageInput.value = '';
    
    // Jika ada pesan, tampilkan pesan user
    if (message) {
        appendMessage('user', message);
    }
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory
            })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    appendMessage('assistant', data.content, true);
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        appendMessage('assistant', 'Maaf, terjadi kesalahan dalam memproses pesan Anda.');
    }
}); 