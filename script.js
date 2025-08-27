// script.js (Version 4.0 - With Time-Awareness)

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
    hello: ['videos/greeting_smile.mp4','videos/greeting_v.mp4'],
    idle: ['videos/idle.mp4'],
    listening: ['videos/listening.mp4'],
};
let isChatOpen = false;
let conversationHistory = [];

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

    const areliaMessageElement = addMessageToUI('', 'arelia');
    areliaMessageElement.innerHTML = '<span class="blinking-cursor"></span>';

    try {
        // --- 新增代码: 获取并格式化当前时间 ---
        const currentTimeString = new Date().toLocaleString('zh-CN', { 
            weekday: 'long', 
            hour: 'numeric', 
            minute: 'numeric', 
            hour12: false 
        });
        // 例如输出: "星期三 早上7:46"
        // --- 新增结束 ---

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // --- 修改这里: 将 currentTimeString 添加到发送的数据中 ---
            body: JSON.stringify({ 
                history: conversationHistory,
                currentTime: currentTimeString 
            }),
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
                    } catch (error) { /* 忽略无法解析的行 */ }
                }
            }
        }
        
        if(fullReply){
            conversationHistory.push({ role: 'assistant', content: fullReply });
        }

    } catch (error) {
        console.error('Error fetching chat response:', error);
        areliaMessageElement.textContent = '（嗯？... 她好像不在...）';
    } finally {
        sendButton.disabled = false;
        chatInput.focus();
    }
}

// --- Event Listeners (保持不变) ---
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
chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
});
