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
    if (!videos || videos.length === 0) return;
    const videoSrc = videos[Math.floor(Math.random() * videos.length)];
    if (videoPlayer.src.endsWith(videoSrc) && videoPlayer.loop === loop) {
        videoPlayer.currentTime = 0;
        videoPlayer.play();
    } else {
        videoPlayer.src = videoSrc;
        videoPlayer.play();
    }
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
    videoPlayer.style.objectPosition = '80% 50%'; // 视觉修正：视频焦点右移
    chatWindow.style.display = 'flex';
    setTimeout(() => { chatWindow.style.opacity = '1'; }, 10);
    playRandomVideoFrom('listening');
});

closeChatButton.addEventListener('click', () => {
    isChatOpen = false;
    videoPlayer.loop = false; // 逻辑修正：告诉视频播完这次就结束
    videoPlayer.style.objectPosition = '50% 50%'; // 视觉修正：视频焦点复位
    chatWindow.style.opacity = '0';
    setTimeout(() => { chatWindow.style.display = 'none'; }, 500);
});

window.addEventListener('DOMContentLoaded', () => {
    playRandomVideoFrom('idle');
});
