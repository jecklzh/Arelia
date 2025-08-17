const videoPlayer = document.getElementById('video-player');
const helloButton = document.getElementById('hello-button');
const chatButton = document.getElementById('chat-button');
const chatWindow = document.getElementById('chat-window');
const closeChatButton = document.getElementById('close-chat-button');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const toggleChatButton = document.getElementById('toggle-chat-button');

const API_ENDPOINT = 'https://arliaapi.stevel.eu.org'; 

const videoLibrary = {
    hello: ['videos/greeting.mp4'],
    idle: ['videos/idle.mp4'],
    listening: ['videos/1.mp4'],
    // 你可以添加更多视频状态来丰富交互
    // thinking: ['videos/thinking.mp4'], 
    // speaking: ['videos/speaking.mp4'], 
};

let currentState = 'idle';
let isChatOpen = false;

function playRandomVideoFrom(category, loop = true) {
    const videos = videoLibrary[category];
    if (!videos || videos.length === 0) return;
    const videoSrc = videos[Math.floor(Math.random() * videos.length)];
    if (videoPlayer.src.endsWith(videoSrc) && videoPlayer.loop === loop) {
        if(videoPlayer.paused) videoPlayer.play();
    } else {
        videoPlayer.src = videoSrc;
        videoPlayer.play();
    }
    videoPlayer.loop = loop;
    currentState = category;
}

videoPlayer.addEventListener('ended', () => {
    if (!videoPlayer.loop) {
        playRandomVideoFrom(isChatOpen ? 'listening' : 'idle');
    }
});

helloButton.addEventListener('click', () => {
    playRandomVideoFrom('hello', false);
});

chatButton.addEventListener('click', () => {
    isChatOpen = true;
    chatWindow.classList.remove('collapsed');
    videoPlayer.style.objectPosition = '80% 50%';
    chatWindow.style.display = 'flex';
    setTimeout(() => { chatWindow.classList.add('visible'); }, 10);
    playRandomVideoFrom('listening');
    toggleChatButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>'; 
    toggleChatButton.setAttribute('aria-label', '折叠窗口');
});

// 修正：修复了变量名的拼写错误 (ccloseChatButton -> closeChatButton)
closeChatButton.addEventListener('click', () => {
    isChatOpen = false;
    videoPlayer.style.objectPosition = '50% 50%';
    chatWindow.classList.remove('visible');
    setTimeout(() => { chatWindow.style.display = 'none'; }, 500);
    playRandomVideoFrom('idle');
});

// --- 聊天逻辑 ---

function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
}

async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    addMessage(messageText, 'user');
    chatInput.value = '';
    sendButton.disabled = true;
    chatInput.disabled = true;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        addMessage(data.reply, 'arelia');

    } catch (error) {
        console.error('Error fetching chat response:', error);
        addMessage('（嗯？... 她好像不在...）', 'user');
    } finally {
        sendButton.disabled = false;
        chatInput.disabled = false;
        chatInput.focus(); 
    }
}

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// --- 聊天窗口折叠/展开逻辑 ---
toggleChatButton.addEventListener('click', () => {
    const isCollapsed = chatWindow.classList.contains('collapsed');

    if (isCollapsed) {
        chatWindow.classList.remove('collapsed');
        videoPlayer.style.objectPosition = '80% 50%';
        toggleChatButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
        toggleChatButton.setAttribute('aria-label', '折叠窗口');
    } else {
        chatWindow.classList.add('collapsed');
        videoPlayer.style.objectPosition = '50% 50%';
        toggleChatButton.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
        toggleChatButton.setAttribute('aria-label', '展开窗口');
    }
});

// --- 页面加载时播放初始视频 ---
window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
});