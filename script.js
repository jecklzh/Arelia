// script.js (Final Version)

const videoPlayer = document.getElementById('video-player');
const helloButton = document.getElementById('hello-button');
const chatButton = document.getElementById('chat-button');
const chatWindow = document.getElementById('chat-window');
const closeChatButton = document.getElementById('close-chat-button');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

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
    // 视频播放结束后，如果是短暂的非循环视频，则切换回当前场景下的默认状态
    if (!videoPlayer.loop) {
        playRandomVideoFrom(isChatOpen ? 'listening' : 'idle');
    }
});

helloButton.addEventListener('click', () => {
    playRandomVideoFrom('hello', false);
});

chatButton.addEventListener('click', () => {
    isChatOpen = true;
    videoPlayer.style.objectPosition = '80% 50%';
    chatWindow.style.display = 'flex';
    setTimeout(() => { chatWindow.style.opacity = '1'; }, 10);
    playRandomVideoFrom('listening');
});

closeChatButton.addEventListener('click', () => {
    isChatOpen = false;
    videoPlayer.style.objectPosition = '50% 50%';
    chatWindow.style.opacity = '0';
    setTimeout(() => { chatWindow.style.display = 'none'; }, 500);
    playRandomVideoFrom('idle');
});

// --- 全新的聊天逻辑 ---

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
        
        // 可选：在这里可以播放 "说话中" 的视频
        // playRandomVideoFrom('speaking', false);
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

window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
});
