// script.js (Version 2.0 - With Conversation Memory)

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

// --- Configuration & State ---
const API_ENDPOINT = 'https://arliaapi.stevel.eu.org'; 
const videoLibrary = {
    hello: ['videos/greeting.mp4'],
    idle: ['videos/idle.mp4'],
    listening: ['videos/1.mp4'],
};
let isChatOpen = false;
let conversationHistory = []; // 新增：用于存储对话历史的数组

// --- Core Functions ---
function playRandomVideoFrom(category, loop = true) {
    // ... (此函数内容不变)
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

function addMessage(text, sender) {
    // 在界面上添加消息
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    
    // 修改：将消息同步添加到对话历史记录中
    const role = (sender === 'user') ? 'user' : 'assistant';
    conversationHistory.push({ role: role, content: text });

    // 滚动到底部
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
}

async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    addMessage(messageText, 'user'); // 这会同时更新界面和 conversationHistory
    chatInput.value = '';
    sendButton.disabled = true;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 修改：发送完整的对话历史，而不是单条消息
            body: JSON.stringify({ history: conversationHistory }),
        });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        const data = await response.json();
        addMessage(data.reply, 'arelia'); // AI的回复也会被自动添加到历史记录中
    } catch (error) {
        console.error('Error fetching chat response:', error);
        addMessage('（嗯？... 她好像不在...）', 'arelia-message');
    } finally {
        sendButton.disabled = false;
        chatInput.focus(); 
    }
}

// --- Event Listeners ---
// ... (videoPlayer, helloButton 事件监听不变)
videoPlayer.addEventListener('ended', () => { if (!videoPlayer.loop) { playRandomVideoFrom(isChatOpen ? 'listening' : 'idle'); } });
helloButton.addEventListener('click', () => { playRandomVideoFrom('hello', false); });


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

closeChatButton.addEventListener('click', () => {
    isChatOpen = false;
    interactionZone.classList.remove('hidden');
    videoPlayer.style.objectPosition = '50% 50%';
    chatWindow.classList.remove('visible');
    setTimeout(() => { chatWindow.style.display = 'none'; }, 500);
    playRandomVideoFrom('idle');
    
    // 新增：关闭聊天时清空历史记录，开始新的对话
    conversationHistory = [];
});

toggleChatButton.addEventListener('click', () => {
    // ... (此函数内容不变)
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
chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
});
