// script.js
const videoPlayer = document.getElementById('video-player');
const helloButton = document.getElementById('hello-button');
const chatButton = document.getElementById('chat-button');
const chatWindow = document.getElementById('chat-window');
const closeChatButton = document.getElementById('close-chat-button');

const videoLibrary = {
    hello: ['videos/greeting.mp4'],
    idle: [
      'videos/idle.mp4'
    ],
    listening: ['videos/1.mp4'],
};

let currentState = 'idle';
let isChatOpen = false;

function playRandomVideoFrom(category, loop = true) {
    const videos = videoLibrary[category];
    if (!videos || videos.length === 0) return;
    const videoSrc = videos[Math.floor(Math.random() * videos.length)];
    if (videoPlayer.src.endsWith(videoSrc)) {
        videoPlayer.currentTime = 0;
        videoPlayer.play();
    } else {
        videoPlayer.src = videoSrc;
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
