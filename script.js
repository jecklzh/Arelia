// script.js (Version 6.0 - Push-to-Talk & Slide-to-Cancel)

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
// --- 新增: "滑动取消"的提示元素 ---
const micCancelHint = document.getElementById('mic-cancel-hint');


// --- Configuration & State ---
const API_ENDPOINT = 'https://arliaapi.stevel.eu.org';
const videoLibrary = {
    hello: ['videos/greeting_smile.mp4', 'videos/greeting_v.mp4'],
    idle: ['videos/idle.mp4'],
    listening: ['videos/listening.mp4'],
};
let isChatOpen = false;
let conversationHistory = [];

// --- 语音识别相关状态 ---
let recognition = null;
let isListening = false;
let cancelOnRelease = false; // --- 新增: 用于标记是否要取消发送 ---


// --- Core Functions (playRandomVideoFrom, addMessageToUI, sendMessage 保持不变) ---
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
        chatInput.focus();
    }
}

// --- !! 语音识别核心功能 (已升级) !! ---
function setupSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) {
        micButton.style.display = 'none';
        console.log("浏览器不支持语音识别功能。");
        return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false; // 改为false，让它在说完话后能自动停止

    const speechRecognitionList = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();
    const grammar = '#JSGF V1.0; grammar names; public <name> = Arelia | 阿蕾莉亚 | 艾瑞莉娅 ;';
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        chatInput.value = transcript;
    };

    recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
    };
    
    recognition.onstart = () => {
        isListening = true;
        micButton.classList.add('listening');
        chatInput.value = '';
        chatInput.placeholder = '我在听...';
    };

    recognition.onend = () => {
        isListening = false;
        micButton.classList.remove('listening');
        chatInput.placeholder = '按住说话...';
        micCancelHint.classList.remove('visible');
    };
}


// --- !! 新增: "按住说话" 和 "滑动取消" 的事件监听 !! ---

// 检查鼠标/手指是否在按钮外部
function isOutside(elem, e) {
    const rect = elem.getBoundingClientRect();
    if (e.touches) { // 触摸事件
        return e.touches[0].clientX < rect.left || e.touches[0].clientX > rect.right || 
               e.touches[0].clientY < rect.top || e.touches[0].clientY > rect.bottom;
    } else { // 鼠标事件
        return e.clientX < rect.left || e.clientX > rect.right || 
               e.clientY < rect.top || e.clientY > rect.bottom;
    }
}

function handleStart(e) {
    e.preventDefault();
    if (isListening || !recognition) return;
    cancelOnRelease = false;
    micCancelHint.classList.remove('visible');
    recognition.start();
}

function handleEnd(e) {
    e.preventDefault();
    if (!isListening) return;
    
    setTimeout(() => { // 稍作延迟以获取最终识别结果
        recognition.stop();
        if (!cancelOnRelease) {
            const correctedText = chatInput.value.replace(/阿蕾莉亚|艾瑞莉娅/g, 'Arelia');
            chatInput.value = correctedText;
            sendMessage();
        } else {
            chatInput.value = ''; // 如果是取消，则清空输入框
        }
    }, 200); // 200毫秒延迟
}

function handleMove(e) {
    if (!isListening) return;
    if (isOutside(micButton, e)) {
        cancelOnRelease = true;
        micCancelHint.classList.add('visible');
    } else {
        cancelOnRelease = false;
        micCancelHint.classList.remove('visible');
    }
}

// 绑定事件
micButton.addEventListener('mousedown', handleStart);
micButton.addEventListener('mouseup', handleEnd);
micButton.addEventListener('mouseleave', () => { if(isListening) { cancelOnRelease = true; micCancelHint.classList.add('visible'); }});
micButton.addEventListener('mouseenter', () => { if(isListening) { cancelOnRelease = false; micCancelHint.classList.remove('visible'); }});

micButton.addEventListener('touchstart', handleStart);
micButton.addEventListener('touchend', handleEnd);
micButton.addEventListener('touchmove', handleMove);


// --- Event Listeners (其余保持不变) ---
// ... (除了DOMContentLoaded中的micButton.addEventListener, 其余都保持不变) ...
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
    if (isListening) recognition.stop();
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
    setupSpeechRecognition();
});
