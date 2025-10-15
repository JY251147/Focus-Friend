// --- Global Log Function --- //
const log = async (message, source = 'App') => {
    const logMessage = `[${new Date().toLocaleTimeString()}] [${source}] ${message}`;
    console.log(logMessage); // Keep logging to the browser console for developers

    try {
        await fetch('http://localhost:5000/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: logMessage }),
        });
    } catch (error) {
        console.error('Failed to send log to server:', error);
    }
};
window.log = log; // Make it global

import { SYSTEM_PROMPT } from './prompt_config.js';
import './smart-clock.js'; // Import the component to register it

// --- Main App Logic //

// --- Notifications //
function requestNotificationPermission() {
    if ('Notification' in window) {
        log('Notification API is available.');
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            log('Requesting notification permission...');
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    log('Notification permission granted.');
                    new Notification('通知已启用', { body: '你将会在休息时间开始时收到提醒。' });
                } else {
                    log('Notification permission denied.', 'Warning');
                }
            });
        }
    } else {
        log('Browser does not support notifications.', 'Warning');
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        log(`Showing notification: "${title}"`);
        new Notification(title, { body: body, icon: './icon.png' });
    } else {
        log('Cannot show notification, permission not granted or not supported.', 'Warning');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission(); // Ask for permission on load
    log('DOM fully loaded and parsed.');

    // --- DOM Element Retrieval //
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const checkHomeworkBtn = document.getElementById('check-homework-btn');
    const photoUpload = document.getElementById('photo-upload');
    const micButton = document.getElementById('mic-button');
    const smartClock = document.querySelector('smart-clock');
    
    log('Retrieved all necessary DOM elements.');

    if (!smartClock) {
        log('CRITICAL: <smart-clock> element not found!', 'Error');
        return;
    }

    let conversationHistory = []; // To store the entire conversation

    // --- Chat Functionality //
    sendButton.addEventListener('click', () => sendMessage());
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage(userInput = null) {
        const textFromInput = chatInput.value.trim();
        let textToSend = userInput === null ? textFromInput : userInput;

        if (textToSend === '') return;
        log(`Sending message. User input: "${userInput ? userInput : textFromInput}"`);

        // --- "I'm Done" (Overlearning) Logic //
        if (textToSend.startsWith('我做完') && smartClock.currentState === 'focus') {
            log('Detected "我做完了" during focus session. Triggering overlearning prompt.');
            addMessage('我做完了！', 'user');
            chatInput.value = '';
            const overlearningPrompt = "我刚刚完成了我的学习任务，请你像一位老师一样，引导我回顾和检查一下刚才学习的内容，帮助我加深理解。";
            await sendAIPrompt(overlearningPrompt);
            return;
        }

        // Regular message sending
        if (userInput === null) {
            addMessage(textToSend, 'user');
            chatInput.value = '';
        }
        
        await sendAIPrompt(textToSend);
    }
    
    async function sendAIPrompt(userInput) {
        log(`Sending prompt to AI: "${userInput}"`);
        chatInput.focus();
        const typingIndicatorId = 'typing-indicator';
        addMessage('正在思考中...', 'bot', typingIndicatorId);

        // Add system prompt if history is empty
        if (conversationHistory.length === 0) {
            conversationHistory.push({ role: 'system', content: SYSTEM_PROMPT });
            log('Conversation history empty. Adding system prompt.');
        }

        // Add user's message to history
        const userMessage = { role: 'user', content: userInput };
        conversationHistory.push(userMessage);

        try {
            const response = await fetch('http://localhost:5000/api/v1/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: conversationHistory }), // Send the entire history
            });

            const typingIndicator = document.getElementById(typingIndicatorId);
            if (typingIndicator) typingIndicator.remove();

            if (!response.ok) {
                const errorData = await response.json();
                log(`Server returned an error: ${response.status}`, 'Error');
                conversationHistory.pop(); // Remove the user message that caused the error
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();
            log('Received AI response object.');
            
            const aiMessage = data.reply; // This is now an object e.g., {role: 'assistant', content: '...'}
            conversationHistory.push(aiMessage); // Add AI's full response object to history

            addMessage(aiMessage.content, 'bot');
            await speak(aiMessage.content);

        } catch (error) {
            log(`Error connecting to AI: ${error.message}`, 'Error');
            const typingIndicator = document.getElementById(typingIndicatorId);
            if (typingIndicator) typingIndicator.remove();
            // The user message that caused the error might still be in history, remove it.
            if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
                conversationHistory.pop();
            }
            addMessage(`Sorry, there was an error connecting to the AI: ${error.message}`, 'bot');
        }
    }

    function addMessage(text, sender, elementId = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        if (elementId) messageElement.id = elementId;
        
        const p = document.createElement('p');
        p.textContent = text;
        messageElement.appendChild(p);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- TTS Function //
    function speak(text) {
        if (!text) {
            log('[Error] Speak function called with no text.');
            return;
        }

        if (!('speechSynthesis' in window)) {
            log('[Error] Browser does not support Speech Synthesis.');
            alert('抱歉，您的浏览器不支持语音朗读功能。');
            return;
        }

        log(`[App] Requesting browser speech for text: "${text.substring(0, 50)}"...`);

        // Cancel any previous speech to prevent overlap
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Function to find and set the voice, then speak
        const setVoiceAndSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            let chineseVoice = voices.find(voice => voice.lang.startsWith('zh-CN')); // Standard Chinese
            if (!chineseVoice) {
                chineseVoice = voices.find(voice => voice.lang.startsWith('zh')); // Any Chinese dialect
            }
            if (!chineseVoice) {
                chineseVoice = voices.find(voice => /chinese|zh-/.test(voice.name.toLowerCase())); // Name-based fallback
            }

            if (chineseVoice) {
                utterance.voice = chineseVoice;
                log(`[App] Using voice: ${chineseVoice.name} (${chineseVoice.lang})`);
            } else {
                log('[Warning] No Chinese voice found. Using browser default.');
            }

            utterance.onerror = (event) => {
                log(`[Error] Speech synthesis error: ${event.error}`);
            };

            window.speechSynthesis.speak(utterance);
        };

        // The list of voices is loaded asynchronously. 
        // We need to check if they are already loaded or wait for the 'voiceschanged' event.
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
        } else {
            setVoiceAndSpeak();
        }
    }

    // --- Custom Event Listeners //
    document.addEventListener('coach-prompt', (e) => {
        log(`Received 'coach-prompt' event.`);
        sendAIPrompt(e.detail);
    });

    document.addEventListener('break-started', () => {
        log(`Received 'break-started' event.`);
        showNotification('休息时间到！', '恭喜你完成专注！现在是5分钟的休息时间。');
    });

    document.addEventListener('active-break-prompt', () => {
        log(`Received 'active-break-prompt' event. Triggering break suggestion.`);
        const breakPrompt = "我现在有5分钟的休息时间，请给我一个有趣的、不需要看屏幕的活动建议，帮助我放松一下。";
        sendAIPrompt(breakPrompt);
    });

    // --- Placeholder/Other Functions //
    checkHomeworkBtn.addEventListener('click', () => photoUpload.click());
    photoUpload.addEventListener('change', (event) => {
        if (event.target.files[0]) {
            addMessage('I see the homework picture... (feature in development)', 'bot');
        }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        micButton.addEventListener('click', () => {
            try {
                recognition.start();
            } catch(e) {
                log("Speech recognition start failed:" + e, 'Error');
                addMessage(`Could not start microphone: ${e.message}`, 'bot');
            }
        });

        recognition.onstart = () => { micButton.classList.add('listening'); micButton.disabled = false; };
        recognition.onspeechstart = () => log('Speech detected.');
        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            chatInput.value = speechResult;
            sendMessage();
        };
        recognition.onend = () => { micButton.classList.remove('listening'); micButton.disabled = false; };
        recognition.onerror = (event) => {
            log(`Speech recognition error: ${event.error}`, 'Error');
            addMessage(`Speech recognition error: ${event.error}`, 'bot');
        };
        recognition.onnomatch = () => { addMessage('I didn\'t catch that. Can you say it again?', 'bot'); };

    } else {
        micButton.style.display = 'none';
        log('Speech recognition not supported.', 'Warning');
    }

    log('Application initialization complete.');
});
