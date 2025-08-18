// script.js (Version 3.0 - With Streaming)

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
    // 这个函数现在只负责在界面上创建并显示消息元素
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatMessages.appendChild(messageElement);
    
    // 滚动到底部
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);

    return messageElement; // 返回创建的元素，以便后续更新
}

// --- !! 核心修改区域 !! ---
async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    // 1. 处理用户消息（UI 和历史记录）
    addMessageToUI(messageText, 'user');
    conversationHistory.push({ role: 'user', content: messageText });
    
    chatInput.value = '';
    sendButton.disabled = true;

    // 2. 为 Arelia 的回复创建一个空的 UI 元素
    const areliaMessageElement = addMessageToUI('', 'arelia');
    areliaMessageElement.innerHTML = '<span class="blinking-cursor"></span>'; // 添加一个闪烁的光标效果

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory }),
        });

        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

        // 3. 准备接收和处理数据流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';

        areliaMessageElement.innerHTML = ''; // 移除光标，准备接收文字

        // 4. 循环读取数据流
        while (true) {
            const { done, value } = await reader.read();
            if (done) break; // 数据流结束

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
                            areliaMessageElement.textContent = fullReply; // 更新 UI
                            chatMessages.scrollTop = chatMessages.scrollHeight; // 实时滚动
                        }
                    } catch (error) { /* 忽略无法解析的行 */ }
                }
            }
        }
        
        // 5. 流结束后，将完整的回复添加到对话历史中
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
// --- !! 修改结束 !! ---

// --- Event Listeners (这部分保持不变) ---
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
