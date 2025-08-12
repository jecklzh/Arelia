// script.js (FIXED VERSION)
const videoPlayer = document.getElementById('video-player');
const helloButton = document.getElementById('hello-button');
const chatButton = document.getElementById('chat-button');
const chatWindow = document.getElementById('chat-window');
const closeChatButton = document.getElementById('close-chat-button');

const videoLibrary = {
    hello: ['videos/greeting.mp4'],
    idle: ['videos/idle.mp4'],
    listening: ['videos/1.mp4'],
};

let currentState = 'idle';
let isChatOpen = false;

function playRandomVideoFrom(category, loop = true) {
    const videos = videoLibrary[category];
    if (!videos || videos.length === 0) {
        console.error(`Video category "${category}" not found or is empty.`);
        return;
    }
    const videoSrc = videos[Math.floor(Math.random() * videos.length)];

    // 核心修正：总是先设置视频源，然后立即调用play()
    videoPlayer.src = videoSrc;
    videoPlayer.play().catch(error => {
        // 捕获并打印可能的播放错误，比如浏览器策略阻止自动播放
        console.error("Video play failed:", error);
    });

    videoPlayer.loop = loop;
    currentState = category;
}


videoPlayer.addEventListener('ended', () => {
    if (currentState === 'hello' || (currentState === 'listening' && !isChatOpen)) {
        playRandomVideoFrom('idle');
    }
});

helloButton.addEventListener('click', () => {
    playRandomVideoFrom('hello', false);
});

chatButton.addEventListener('click', () => {
    isChatOpen = true;
    chatWindow.style.display = 'flex';
    setTimeout(() => { chatWindow.style.opacity = '1'; }, 10);
    playRandomVideoFrom('listening');
});

closeChatButton.addEventListener('click', () => {
    isChatOpen = false;
    chatWindow.style.opacity = '0';
    setTimeout(() => { chatWindow.style.display = 'none'; }, 500);
});

window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
});
