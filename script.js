// script.js (Version 6.0 - Stable Voice Input)

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
// --- 新增: 麦克风按钮 ---
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

// --- 新增: 语音识别相关状态 ---
let recognition = null;
let isListening = false;
// --- 新增结束 ---

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

// --- !! 新增: 语音识别核心功能 !! ---
function setupSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) {
        micButton.style.display = 'none'; // 如果浏览器不支持，就隐藏按钮
        return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // 设置语言为中文
    recognition.interimResults = true; // 实时返回中间结果
    recognition.continuous = false; // 只识别一句

    // --- 关键: 为 "Arelia" 添加关键词增强 ---
    const speechRecognitionList = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();
    const grammar = '#JSGF V1.0; grammar names; public <name> = Arelia ;'; // 只放最关键的词
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;

    // 监听识别结果
    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        chatInput.value = transcript;
    };

    // 监听结束事件
    recognition.onend = () => {
        stopListening();
    };
    
    // 监听错误事件
    recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        stopListening();
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
// --- !! 新增功能区结束 !! ---


// --- Event Listeners (部分修改和新增) ---
// ... (大部分保持不变)
closeChatButton.addEventListener('click', () => {
    if (isListening) stopListening(); // 关闭窗口时停止监听
    isChatOpen = false;
    // ... (其余代码不变)
});
// ...
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') { sendMessage(); } });

// --- 新增: 麦克风按钮的“开关”点击事件 ---
micButton.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});
// --- 新增结束 ---

window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
    setupSpeechRecognition(); // 页面加载时初始化语音识别
});
