// script.js (Version 6.1 - Restored Button Functionality)

// --- DOM Element Selection ---
const videoPlayer = document.getElementById('video-player');
const interactionZone = document.querySelector('.interaction-zone');
const helloButton = document.getElementById('hello-button');
const chatButton = document.getElementById('chat-button');
const chatWindow = document.getElementById('chat-window');
const closeChatButton = document.getElementById('close-chat-button');
const toggleChatButton = document.getElementById('toggle-chat-button');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');

// --- Configuration & State ---
const API_ENDPOINT = 'https://arliaapi.stevel.eu.org'; 
const videoLibrary = {
    hello: ['videos/greeting_smile.mp4','videos/greeting_v.mp4'],
    idle: ['videos/idle.mp4'],
    listening: ['videos/listening.mp4'],
};
let isChatOpen = false;
let conversationHistory = [];

// --- 语音识别相关状态 ---
let recognition = null;
let isListening = false;

// --- Core Functions ---
function playRandomVideoFrom(category, loop = true) {
    const videos = videoLibrary[category];
    if (!videos || videos.length === 0) return;
    const videoSrc = videos[Math.floor(Math.random() * videos.length)];
    if (videoPlayer.src.endsWith(videoSrc) && videoPlayer.loop === loop) {
        if (videoPlayer.paused) videoPlayer.play();
    } else {
        videoPlayer.src = videoSrc;
        videoPlayer.play();
    }
    videoPlayer.loop = loop;
}

function addMessageToUI(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
    return messageElement;
}

async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;
    addMessageToUI(messageText, 'user');
    conversationHistory.push({ role: 'user', content: messageText });
    chatInput.value = '';
    sendButton.disabled = true;
    micButton.disabled = true; // 发送时禁用麦克风
    const areliaMessageElement = addMessageToUI('', 'arelia');
    areliaMessageElement.innerHTML = '<span class="blinking-cursor"></span>';
    try {
        const currentTimeString = new Date().toLocaleString('zh-CN', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: false });
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory, currentTime: currentTimeString }),
        });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';
        areliaMessageElement.innerHTML = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const content = line.substring(6);
                    if (content.trim() === '[DONE]') continue;
                    try {
                        const json = JSON.parse(content);
                        const textChunk = json.choices[0].delta?.content || '';
                        if (textChunk) {
                            fullReply += textChunk;
                            areliaMessageElement.textContent = fullReply;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (error) { /* 忽略 */ }
                }
            }
        }
        if (fullReply) {
            conversationHistory.push({ role: 'assistant', content: fullReply });
        }
    } catch (error) {
        console.error('Error fetching chat response:', error);
        areliaMessageElement.textContent = '（嗯？... 她好像不在...）';
    } finally {
        sendButton.disabled = false;
        micButton.disabled = false; // 恢复麦克风
        chatInput.focus();
    }
}

// --- 语音识别核心功能 ---
function setupSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!micButton || !window.SpeechRecognition) {
        if(micButton) micButton.style.display = 'none';
        return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;

    const speechRecognitionList = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();
    const grammar = '#JSGF V1.0; grammar names; public <name> = Arelia ;';
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        chatInput.value = transcript;
    };

    recognition.onend = () => {
        if (isListening) stopListening();
    };
    
    recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        if (isListening) stopListening();
    };
}

function startListening() {
    if (isListening || !recognition) return;
    isListening = true;
    micButton.classList.add('listening');
    chatInput.placeholder = '我在听...';
    recognition.start();
}

function stopListening() {
    if (!isListening || !recognition) return;
    isListening = false;
    micButton.classList.remove('listening');
    chatInput.placeholder = '和 Arelia 说点什么...';
    recognition.stop();
}

// --- Event Listeners ---

// --- !! 修正: 将这两个按钮的事件监听加回来 !! ---
helloButton.addEventListener('click', () => {
    playRandomVideoFrom('hello', false);
});

chatButton.addEventListener('click', () => {
    isChatOpen = true;
    interactionZone.classList.add('hidden');
    chatWindow.classList.remove('collapsed');
    videoPlayer.style.objectPosition = '80% 50%';
    chatWindow.style.display = 'flex';
    setTimeout(() => chatWindow.classList.add('visible'), 10);
    playRandomVideoFrom('listening');
    toggleChatButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>'; 
    toggleChatButton.setAttribute('aria-label', '折叠窗口');
});
// --- 修正结束 ---

videoPlayer.addEventListener('ended', () => { if (!videoPlayer.loop) { playRandomVideoFrom(isChatOpen ? 'listening' : 'idle'); } });

closeChatButton.addEventListener('click', () => {
    if (isListening) stopListening();
    isChatOpen = false;
    interactionZone.classList.remove('hidden');
    videoPlayer.style.objectPosition = '50% 50%';
    chatWindow.classList.remove('visible');
    setTimeout(() => { chatWindow.style.display = 'none'; }, 500);
    playRandomVideoFrom('idle');
    conversationHistory = [];
});

toggleChatButton.addEventListener('click', () => {
    const isCollapsed = chatWindow.classList.toggle('collapsed');
    if (isCollapsed) {
        videoPlayer.style.objectPosition = '50% 50%';
        toggleChatButton.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
        toggleChatButton.setAttribute('aria-label', '展开窗口');
    } else {
        videoPlayer.style.objectPosition = '80% 50%';
        toggleChatButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
        toggleChatButton.setAttribute('aria-label', '折叠窗口');
    }
});

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') { sendMessage(); } });

micButton.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
    setupSpeechRecognition();
});
