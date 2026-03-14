// --- Global Globals ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Global Error Handler ---
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error(`GLOBAL ERROR: ${msg} at ${url}:${lineNo}`);
    // If the game is still loading, try to proceed anyway after 2 seconds
    if (!loadingDone) {
        setTimeout(proceedToGame, 2000);
    }
    return false;
};

// --- AdMob Integration ---
async function initAds() {
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        const { AdMob } = window.Capacitor.Plugins;
        try {
            // Give the bridge a moment to stabilize
            await new Promise(r => setTimeout(r, 1000));
            await AdMob.initialize(); // Removed requestTrackingAuthorization which is for iOS ATT
            console.log("AdMob Initialized");
        } catch (e) {
            console.error("AdMob Init Error", e);
        }
    }
}


async function showInterstitial() {
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        const { AdMob } = window.Capacitor.Plugins;
        try {
            await AdMob.prepareInterstitial({
                adId: 'ca-app-pub-4159023709825629/4795233193',
            });
            await AdMob.showInterstitial();
        } catch (e) {
            console.warn("AdMob Show Interstitial Error:", e.message);
        }
    }
}

async function showBanner() {
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        const { AdMob } = window.Capacitor.Plugins;
        try {
            await AdMob.showBanner({
                adId: 'ca-app-pub-4159023709825629/8163157205',
                adSize: 'BANNER',
                position: 'BOTTOM_CENTER',
                margin: 0,
                isTesting: false
            });
        } catch (e) {
            console.warn("AdMob Show Banner Error:", e.message);
        }
    }
}

async function hideBanner() {
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        const { AdMob } = window.Capacitor.Plugins;
        try {
            await AdMob.hideBanner();
        } catch (e) {
            console.warn("AdMob Hide Banner Error:", e.message);
        }
    }
}

// Start Ads asynchronously
setTimeout(initAds, 500);


// --- Mobile App State Management ---
let isAppInBackground = false;
if (window.Capacitor) {
    const { App } = window.Capacitor.Plugins;
    
    App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            console.log("App active");
            isAppInBackground = false;
            // Resume music if we were in a game
            if (gameRunning && !gameOver && !isDying) {
                soundSystem.playMusic();
            }
        } else {
            console.log("App background");
            isAppInBackground = true;
            soundSystem.music.pause();
        }
    });

    App.addListener('backButton', () => {
        if (gameRunning && !gameOver) {
            backToMenu();
        } else if (startScreen.style.display !== 'none') {
            App.exitApp();
        } else {
            backToMenu();
        }
    });
}
// -------------------------
const startScreen = document.getElementById('startScreen');
const extrasScreen = document.getElementById('extrasScreen');
const optionsScreen = document.getElementById('optionsScreen');
const creditsScreen = document.getElementById('creditsScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const extrasButton = document.getElementById('extrasButton');
const optionsButton = document.getElementById('optionsButton');
const creditsButton = document.getElementById('creditsButton');
const backButton = document.getElementById('backButton');
const extrasBackButton = document.getElementById('extrasBackButton');
const creditsBackButton = document.getElementById('creditsBackButton');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const finalScoreDisplay = document.getElementById('finalScore');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

const rankingScreen = document.getElementById('rankingScreen');
const rankingButton = document.getElementById('rankingButton');
const rankingBackButton = document.getElementById('rankingBackButton');
const leaderboardList = document.getElementById('leaderboardList');
const nameEntryScreen = document.getElementById('nameEntryScreen');
const playerNameInput = document.getElementById('playerNameInput');
const submitScoreButton = document.getElementById('submitScoreButton');
const nameEntryBackButton = document.getElementById('nameEntryBackButton');

// --- Firebase Configuration ---
const firebaseConfig = {
  projectId: "fish-rush-jijascuas",
  appId: "1:572420035953:web:096c8d3faefbf8bd57d2d0",
  storageBucket: "fish-rush-jijascuas.firebasestorage.app",
  apiKey: "AIzaSyAM5Osrpfr7rE1UmC-Uqtrp90x14GErB9E",
  authDomain: "fish-rush-jijascuas.firebaseapp.com",
  messagingSenderId: "572420035953"
};

let db = null;
let auth = null;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            
            auth.onAuthStateChanged((user) => {
                if (!user) {
                    auth.signInAnonymously().catch(e => console.error("Firebase Auth Error", e));
                }
            });
            console.log("Firebase initialized");
        } catch (e) {
            console.error("Firebase Init Error", e);
        }
    } else {
        console.warn("Firebase SDK not found. Offline mode active.");
    }
}

// Call initFirebase early but safely
setTimeout(initFirebase, 100);


// Appearance buttons (6 appearances)
const appearanceButtons = [
    document.getElementById('appearance1'),
    document.getElementById('appearance2'),
    document.getElementById('appearance3'),
    document.getElementById('appearance4'),
    document.getElementById('appearance5'),
    document.getElementById('appearance6')
];

// --- Audio System ---
class GameSoundSystem {
    constructor() {
        this.ctx = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.5;
        this.music = new Audio();
        this.music.src = 'assets/music.mp3';
        this.music.loop = true;
        this.music.preload = 'auto';
        this.music.autoplay = false;
        
        this.isMusicPlaying = false;
        
        // Ensure music stays playing and doesn't get stuck

        this.music.addEventListener('play', () => { 
            this.isMusicPlaying = true;
        });
        this.music.addEventListener('pause', () => { 
            this.isMusicPlaying = false;
        });
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playMusic() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.music.volume = this.musicVolume;
        
        // Ensure proper source and loop
        if (!this.music.src.includes('assets/music.mp3')) {
            this.music.src = 'assets/music.mp3';
        }
        this.music.loop = true;

        // CRITICAL: Only play if paused AND not already trying to play
        if (this.music.paused) {
            console.log("playMusic() triggered");
            const playPromise = this.music.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("Music playing successfully");
                }).catch(e => {
                    console.warn("Music play blocked/failed:", e.message);
                });
            }
        }
    }

    stopMusic() {
        this.music.pause();
        this.music.currentTime = 0;
        this.music.playbackRate = 1.0;
    }

    setPlaybackRate(rate) {
        this.music.playbackRate = rate;
    }

    setVolume(val) {
        this.musicVolume = val;
        this.music.volume = val;
    }

    playScoreSound() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * this.sfxVolume, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playHitSound() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        
        gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playLifeSound() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playShieldSound() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playPopSound() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // A short, punchy "pop" sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
        
        gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playIntroSound() {
        // Disabled intro sound
    }
}


// Global interaction listener to unlock AudioContext
const unlockAudio = () => {
    soundSystem.init();
    if (soundSystem.ctx && soundSystem.ctx.state === 'suspended') {
        soundSystem.ctx.resume();
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
};
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

const soundSystem = new GameSoundSystem();
let currentVolume = 5;

// High score tracking
let highScore = parseInt(localStorage.getItem('fishRushHighScore') || '0');

const numberImages = [];
const numberUrls = Array.from({length: 10}, (_, i) => `assets/numbers/${i}.png`);
numberUrls.forEach((url, i) => {
    numberImages[i] = new Image();
    numberImages[i].onload = checkImagesLoaded;
    numberImages[i].onerror = handleImageError;
    numberImages[i].src = url;
});

const clownfishImages = [];
const clownfishUrls = Array.from({length: 6}, (_, i) => `assets/fish/${i}.png`);
clownfishUrls.forEach((url, i) => {
    clownfishImages[i] = new Image();
    clownfishImages[i].onload = checkImagesLoaded;
    clownfishImages[i].onerror = handleImageError;
    clownfishImages[i].src = url;
});

const hitImages = [];
const hitUrls = Array.from({length: 6}, (_, i) => `assets/hits/${i}.png`);
hitUrls.forEach((url, i) => {
    hitImages[i] = new Image();
    hitImages[i].onload = checkImagesLoaded;
    hitImages[i].onerror = handleImageError;
    hitImages[i].src = url;
});

// Other single images
const backgroundImage = new Image();
backgroundImage.onload = checkImagesLoaded;
backgroundImage.onerror = handleImageError;
backgroundImage.src = 'assets/background.png';

const loadingBgImage = new Image();
loadingBgImage.onload = () => {
    checkImagesLoaded();
};
loadingBgImage.onerror = handleImageError;
loadingBgImage.src = 'assets/loading_bg.png';


const heartIconImage = new Image();
heartIconImage.onload = checkImagesLoaded;
heartIconImage.onerror = handleImageError;
heartIconImage.src = 'assets/ui/heart_icon.png';

const sharkImage = new Image();
sharkImage.onload = checkImagesLoaded;
sharkImage.onerror = handleImageError;
sharkImage.src = 'assets/shark.png';

const seashellImage = new Image();
seashellImage.onload = checkImagesLoaded;
seashellImage.onerror = handleImageError;
seashellImage.src = 'assets/obstacles/seashell.png';

const fishhookImage = new Image();
fishhookImage.onload = checkImagesLoaded;
fishhookImage.onerror = handleImageError;
fishhookImage.src = 'assets/obstacles/fishhook.png';

const shipwheelImage = new Image();
shipwheelImage.onload = checkImagesLoaded;
shipwheelImage.onerror = handleImageError;
shipwheelImage.src = 'assets/obstacles/shipwheel.png';

const bubbleShieldImage = new Image();
bubbleShieldImage.onload = checkImagesLoaded;
bubbleShieldImage.onerror = handleImageError;
bubbleShieldImage.src = 'assets/ui/bubble_shield.png';

const heartImage = new Image();
heartImage.onload = checkImagesLoaded;
heartImage.onerror = handleImageError;
heartImage.src = 'assets/obstacles/heart.png';

const shieldBubbleImage = new Image();
shieldBubbleImage.onload = checkImagesLoaded;
shieldBubbleImage.onerror = handleImageError;
shieldBubbleImage.src = 'assets/ui/bubble_shield.png';

const scoreLabelImage = new Image();
scoreLabelImage.onload = checkImagesLoaded;
scoreLabelImage.onerror = handleImageError;
scoreLabelImage.src = 'assets/ui/score_label.png';


// --- Robust Loading System ---
// Uses a counter + a hard timeout to GUARANTEE the game always starts.
// Even if onload/onerror never fires (common in Android WebViews), the
// 6-second timeout will kick in and proceed anyway.

let imagesLoaded = 0;
const totalImages = 33;
let loadingDone = false;
const loadingStartTime = Date.now();

function proceedToGame() {
    if (loadingDone) return; 
    loadingDone = true;
    console.log(`[Loading] Images ready. Showing menu.`);
    
    drawInitialState();
    soundSystem.setVolume(currentVolume / 10);
    switchScreen(startScreen);
}


function checkImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded >= totalImages) {
        proceedToGame();
    }
}

function handleImageError(e) {
    console.warn('[Loading] Image failed:', e && e.target ? e.target.src : 'unknown');
    checkImagesLoaded();
}

// SAFETY NET: After 7 seconds, proceed no matter what.
// This handles cases where some onload/onerror events never fire in Android WebView.
setTimeout(() => {
    if (!loadingDone) {
        console.warn(`[Loading] Timeout! Proceeding anyway.`);
        proceedToGame();
    }
}, 7000);



// Global helper for clean screen switching
function switchScreen(newScreen) {
    // Hide all screens first
    const screens = [startScreen, extrasScreen, optionsScreen, creditsScreen, gameOverScreen, rankingScreen, nameEntryScreen];
    screens.forEach(s => {
        if (s) s.style.display = 'none';
    });


    // Show only the requested one as a flex container
    if (newScreen) {
        newScreen.style.display = 'flex';
        // Ensure it's opaque immediately
        newScreen.style.opacity = '1';
        newScreen.style.pointerEvents = 'auto';

        // Show banner on menu screens
        if (newScreen === startScreen || newScreen === extrasScreen || newScreen === optionsScreen || newScreen === rankingScreen) {
            showBanner();
        } else {
            hideBanner();
        }
    } else {
        hideBanner();
    }
}


[backgroundImage, heartIconImage, sharkImage, seashellImage, fishhookImage, shipwheelImage, bubbleShieldImage, heartImage, shieldBubbleImage, scoreLabelImage, ...clownfishImages, ...numberImages, ...hitImages].forEach(img => {

    img.onload = checkImagesLoaded;
    img.onerror = handleImageError;
});

// Game variables
let gameRunning = false;
let score = 0;
let lives = 10;
let clownfishY = canvas.height / 2;
let obstacles = [];
let speed = 9;
let nextObstacleTime = 0;
let lastTimestamp = 0;
let isTouching = false;
let gameOver = false;
let nextSpeedIncrease = 20;
let obstacleFrequency = 1500;
let isDying = false;
let deathProgress = 0;
let shieldActive = false;
let shieldHitsRemaining = 0;
let isHit = false;
let hitStartTime = 0;
const HIT_DURATION = 100;
let selectedAppearance = 0;

// Shark entrance
let sharkX = 0;
let sharkEntranceComplete = false;
const SHARK_ENTRANCE_SPEED = 150;

// Constants
const FRAME_TIME = 1000 / 60;
const BASE_CLOWNFISH_X = 280; // Adjusted for better view on mobile
const CLOWNFISH_STEP = 12;
const SHARK_WIDTH_RATIO = 0.32; // Slightly smaller shark to give more play area
const MIN_GAP = 100; // Increased gap for mobile comfort
const CLOWNFISH_WIDTH = 100; // Scaled down slightly
const CLOWNFISH_HEIGHT = 70;
const SHIELD_BUBBLE_SIZE = CLOWNFISH_WIDTH * 1.1;
const HITBOX_SIZE = 35; // Smaller hitboxes for fairer mobile play

const OBSTACLE_TYPES = [
    { name: 'seashell', damage: 1, color: '#e8b497', symbol: '🐚' },
    { name: 'fishhook', damage: 2, color: '#a9a9a9', symbol: '🪝' },
    { name: 'shipwheel', damage: 3, color: '#5d4037', symbol: 'helm' },
    { name: 'heart', damage: -3, color: '#ff4d4d', symbol: '❤️' },
    { name: 'bubble', damage: 0, color: '#a8e6cf', symbol: '💧', shield: true }
];

// Event listeners - Wrapped in safe checks to prevent crashes
const setupButton = (id, handler) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    let lastTime = 0;
    const trigger = (e) => {
        const now = Date.now();
        if (now - lastTime < 500) return; // Prevent double trigger within 500ms
        lastTime = now;
        
        soundSystem.playPopSound();
        handler();
    };

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        trigger(e);
    });
    
    btn.addEventListener('touchstart', (e) => {
        // e.preventDefault(); // Don't prevent default so focus etc works, but we act immediately
        trigger(e);
    }, { passive: true });
};


setupButton('startButton', startGame);
setupButton('extrasButton', showExtras);
setupButton('optionsButton', showOptions);
setupButton('creditsButton', showCredits);
setupButton('rankingButton', showRanking);
setupButton('restartButton', restartGame);
setupButton('menuButton', backToMenu);
setupButton('submitScoreButton', submitScore);

setupButton('backButton', hideOptions);
setupButton('extrasBackButton', hideExtras);
setupButton('creditsBackButton', hideCredits);
setupButton('rankingBackButton', hideRanking);
setupButton('nameEntryBackButton', () => switchScreen(startScreen));

if (volumeSlider) volumeSlider.addEventListener('input', updateVolume);

// Generic pop sound for all buttons including those not in our list
document.querySelectorAll('.button, .privacy-link').forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            if (!btn.id || !['startButton', 'extrasButton', 'optionsButton', 'creditsButton', 'rankingButton', 'restartButton', 'menuButton', 'submitScoreButton'].includes(btn.id)) {
                soundSystem.playPopSound();
            }
        });
    }
});


appearanceButtons.forEach((button, index) => {
    if (button) {
        button.addEventListener('click', () => {
            const unlockReq = parseInt(button.getAttribute('data-unlock') || '0');
            if (highScore >= unlockReq) {
                soundSystem.playPopSound();
                selectedAppearance = index;
                appearanceButtons.forEach(btn => btn && btn.classList.remove('selected'));
                button.classList.add('selected');
            }
        });
    }
});


// Helper to get relative coordinates, accounting for CSS rotation
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    isTouching = true;
    const pos = getMousePos(e);
    clownfishY = pos.y;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (!isTouching || !gameRunning || gameOver || isDying) return;
    e.preventDefault();
    const pos = getMousePos(e);
    clownfishY = pos.y;
}, { passive: false });

canvas.addEventListener('touchend', () => isTouching = false);

canvas.addEventListener('mousedown', e => {
    isTouching = true;
    const pos = getMousePos(e);
    clownfishY = pos.y;
});

canvas.addEventListener('mousemove', e => {
    if (!isTouching || !gameRunning || gameOver || isDying) return;
    const pos = getMousePos(e);
    clownfishY = pos.y;
});

canvas.addEventListener('mouseup', () => isTouching = false);
canvas.addEventListener('mouseout', () => isTouching = false);

// Functions
function drawInitialState() {
    drawBackground();
    drawSharkMouth();
    drawClownfish();
    drawUI();
}

function showExtras() {
    appearanceButtons.forEach(btn => {
        const unlockReq = parseInt(btn.getAttribute('data-unlock'));
        btn.classList.toggle('locked', highScore < unlockReq);
    });
    switchScreen(extrasScreen);
}

function hideExtras() {
    switchScreen(startScreen);
    soundSystem.stopMusic();
}

function showOptions() {
    switchScreen(optionsScreen);
    soundSystem.playMusic(); // Play music so the user can preview volume
}

function hideOptions() {
    switchScreen(startScreen);
    soundSystem.stopMusic(); // Stop music when leaving options
}

function showCredits() {
    switchScreen(creditsScreen);
}

function hideCredits() {
    switchScreen(startScreen);
}

function showRanking() {
    switchScreen(rankingScreen);
    fetchLeaderboard();
}

function hideRanking() {
    switchScreen(startScreen);
}

async function fetchLeaderboard() {
    // Pre-fill 100 empty slots immediately
    leaderboardList.innerHTML = '';
    const slots = [];
    for (let i = 1; i <= 100; i++) {
        const item = document.createElement('div');
        item.className = 'ranking-item empty-slot';
        item.id = `rank-slot-${i}`;
        item.innerHTML = `
            <span class="rank${i <= 3 ? ' top3' : ''}">${i}.</span>
            <span class="entry">------  -  ---</span>
        `;
        leaderboardList.appendChild(item);
        slots.push(item);
    }

    try {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection('leaderboard')
            .orderBy('score', 'desc')
            .limit(100)
            .get();

        let rank = 0;
        snapshot.forEach(doc => {
            if (rank >= 100) return;
            const data = doc.data();
            const name = (data.name || '???').substring(0, 6).toUpperCase();
            const sc = data.score ?? 0;
            const item = slots[rank];
            item.className = 'ranking-item';
            item.innerHTML = `
                <span class="rank${rank < 3 ? ' top3' : ''}">${rank + 1}.</span>
                <span class="entry"><span class="entry-name">${name}</span><span class="entry-sep"> - </span><span class="entry-score">${sc}</span></span>
            `;
            rank++;
        });
    } catch (e) {
        console.error(e);
        leaderboardList.innerHTML = '<div class="loading-ranks">Error loading scores.</div>';
    }
}

async function submitScore() {
    const name = playerNameInput.value.trim() || 'Anonymous';
    localStorage.setItem('fishRushPlayerName', name);
    
    // Visual feedback: disable button
    submitScoreButton.disabled = true;
    submitScoreButton.style.opacity = "0.5";
    
    try {
        if (!auth || !db) throw new Error("Firebase not initialized");
        if (!auth.currentUser) {
            console.error("Auth: No current user authenticated.");
            // Try to sign in anonymously again if not ready
            await auth.signInAnonymously();
            if (!auth.currentUser) throw new Error("Authentication not ready");
        }

        await db.collection('leaderboard').add({
            name: name,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: auth.currentUser.uid
        });

        submitScoreButton.disabled = false;
        submitScoreButton.style.opacity = "1";
        renderGameOverScore();
        switchScreen(gameOverScreen);
    } catch (e) {
        console.error("Error uploading score:", e);
        alert("Error connectivity: Score not saved to Online Ranking, but saved on your device!");
        
        submitScoreButton.disabled = false;
        submitScoreButton.style.opacity = "1";
        
        renderGameOverScore();
        switchScreen(gameOverScreen);
    }
}

function updateVolume() {
    currentVolume = parseInt(volumeSlider.value);
    volumeValue.innerHTML = '';
    const volStr = currentVolume.toString();
    for (const char of volStr) {
        const d = parseInt(char);
        if (numberImages[d] && numberImages[d].src) {
            const img = document.createElement('img');
            img.src = numberImages[d].src;
            volumeValue.appendChild(img);
        } else {
            volumeValue.textContent = volStr;
            break;
        }
    }
    soundSystem.setVolume(currentVolume / 10);
    localStorage.setItem('fishRushVolume', currentVolume);
}


function backToMenu() {
    switchScreen(startScreen);
    canvas.classList.remove('game-active'); // Hide canvas when in menu
    soundSystem.stopMusic();
}

function startGame() {
    switchScreen(null); // Hide all screens
    canvas.classList.add('game-active'); // Show canvas now
    gameRunning = true;
    gameOver = false;
    isDying = false;
    isHit = false;
    score = 0;
    lives = 10;
    clownfishY = canvas.height / 2;
    obstacles = [];
    speed = 9;
    nextSpeedIncrease = 20;
    obstacleFrequency = 1500;
    nextObstacleTime = 0;
    shieldActive = false;
    shieldHitsRemaining = 0;
    sharkX = -canvas.width;
    sharkEntranceComplete = false;

    soundSystem.setPlaybackRate(1.0);
    soundSystem.playMusic();
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    gameOverScreen.style.display = 'none';
    startGame();
}

async function gameOverFunction() {
    gameOver = true;
    gameRunning = false;
    isDying = false;
    soundSystem.stopMusic();

    // Show Interstitial Ad on Game Over
    showInterstitial();

    // 1. Get previous record
    const previousBest = parseInt(localStorage.getItem('fishRushHighScore') || '0');
    const isNewPersonalRecord = score > previousBest && score > 0;
    
    console.log(`[GameOver] Score: ${score}, Personal Best: ${previousBest}, IsNewRecord: ${isNewPersonalRecord}`);

    // 2. Update local storage
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('fishRushHighScore', highScore);
    }

    let qualifiesForTop100 = false;
    
    if (score > 0) {
        // ALWAYS show if it's a new personal record
        if (isNewPersonalRecord) {
            console.log("[Ranking] Qualifies: New personal record.");
            qualifiesForTop100 = true;
        } else {
            // Check if it qualifies for Global Top 100
            try {
                console.log("[Ranking] Checking global Top 100...");
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
                if (!db) throw new Error("DB not ready");
                const queryPromise = db.collection('leaderboard').orderBy('score', 'desc').limit(100).get();
                
                const snapshot = await Promise.race([queryPromise, timeoutPromise]);
                
                if (snapshot.size < 100) {
                    console.log("[Ranking] Qualifies: Less than 100 scores in total.");
                    qualifiesForTop100 = true;
                } else {
                    const lowestScore = snapshot.docs[snapshot.docs.length - 1].data().score;
                    qualifiesForTop100 = score > lowestScore;
                    console.log(`[Ranking] Global 100th score: ${lowestScore}. Qualifies: ${qualifiesForTop100}`);
                }
            } catch (e) {
                console.warn("[Ranking] Global check failed/timed out:", e.message);
                qualifiesForTop100 = isNewPersonalRecord;
            }
        }
    }

    // 3. Switch to correct screen
    if (qualifiesForTop100) {
        const savedName = localStorage.getItem('fishRushPlayerName') || '';
        playerNameInput.value = savedName;
        console.log("[GameOver] Switching to Name Entry screen.");
        switchScreen(nameEntryScreen);
    } else {
        console.log("[GameOver] Switching to normal Game Over screen.");
        renderGameOverScore();
        switchScreen(gameOverScreen);
    }
}

function renderGameOverScore() {
    let scoreHtml = '<img src="assets/ui/record_dodged.png" alt="Record Dodged" style="height: 28px; vertical-align: middle; margin-right: 5px;">';
    highScore.toString().split('').forEach(digit => {
        scoreHtml += `<img src="${numberImages[parseInt(digit)].src}" alt="${digit}">`;
    });
    finalScoreDisplay.innerHTML = scoreHtml;
}

function generateObstacleWave() {
    if (gameOver || isDying) return;
    const numObstacles = Math.floor(Math.random() * 3) + 1;
    const positions = [];
    const minY = 50, maxY = canvas.height - 90;
    const availableHeight = maxY - minY;

    for (let i = 0; i < numObstacles; i++) {
        let yPos;
        for (let attempt = 0; attempt < 30; attempt++) {
            yPos = minY + Math.random() * availableHeight;
            if (positions.every(pos => Math.abs(yPos - pos) >= MIN_GAP)) break;
        }
        positions.push(yPos);
    }

    positions.forEach(yPos => {
        const rand = Math.random();
        let type;
        if (rand < 0.01) type = OBSTACLE_TYPES[4];
        else if (rand < 0.03) type = OBSTACLE_TYPES[3];
        else {
            const r = Math.random() * 100;
            if (r < 50) type = OBSTACLE_TYPES[0];
            else if (r < 80) type = OBSTACLE_TYPES[1];
            else type = OBSTACLE_TYPES[2];
        }

        obstacles.push({
            x: canvas.width + 50,
            y: yPos - 20,
            width: 50,
            height: 50,
            type: type.name,
            damage: type.damage,
            color: type.color,
            symbol: type.symbol,
            shield: type.shield || false,
            scored: false
        });
    });
}

function drawBackground() {
    if (backgroundImage.complete) ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    else {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#051e30'); grad.addColorStop(1, '#0a3d62');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawSharkMouth() {
    const sw = canvas.width * SHARK_WIDTH_RATIO;
    if (sharkImage.complete) ctx.drawImage(sharkImage, sharkX, 0, sw, canvas.height);
}

function getCurrentClownfishX() {
    return BASE_CLOWNFISH_X - (10 - lives) * CLOWNFISH_STEP;
}

function drawClownfish() {
    let x, y = clownfishY;
    if (isDying) {
        x = getCurrentClownfishX() + (-CLOWNFISH_WIDTH - getCurrentClownfishX()) * deathProgress;
        y = clownfishY + (canvas.height / 2 - clownfishY) * deathProgress;
    } else x = getCurrentClownfishX();

    if (isHit && !isDying && performance.now() - hitStartTime < HIT_DURATION) {
        const hitImg = hitImages[selectedAppearance] || hitImages[0];
        const w = (selectedAppearance > 0) ? CLOWNFISH_WIDTH * 0.5 : CLOWNFISH_WIDTH;
        const h = (selectedAppearance > 0) ? CLOWNFISH_HEIGHT * 0.5 : CLOWNFISH_HEIGHT;
        ctx.drawImage(hitImg, x - w/2, y - h/2, w, h);
        return;
    } else isHit = false;

    if (shieldActive && !isDying) {
        if (shieldBubbleImage.complete) ctx.drawImage(shieldBubbleImage, x - SHIELD_BUBBLE_SIZE/2, y - SHIELD_BUBBLE_SIZE/2, SHIELD_BUBBLE_SIZE, SHIELD_BUBBLE_SIZE);
        else {
            ctx.fillStyle = 'rgba(173, 216, 230, 0.35)'; ctx.beginPath();
            ctx.arc(x, y, SHIELD_BUBBLE_SIZE/2, 0, Math.PI * 2); ctx.fill();
        }
    }

    const fishImg = clownfishImages[selectedAppearance];
    if (fishImg.complete && (gameRunning || isDying)) {
        const w = (selectedAppearance > 0) ? CLOWNFISH_WIDTH * 0.5 : CLOWNFISH_WIDTH;
        const h = (selectedAppearance > 0) ? CLOWNFISH_HEIGHT * 0.5 : CLOWNFISH_HEIGHT;
        ctx.drawImage(fishImg, x - w/2, y - h/2, w, h);
    }
}

function drawObstacles() {
    obstacles.forEach(obs => {
        let img;
        if (obs.type === 'seashell') img = seashellImage;
        else if (obs.type === 'fishhook') img = fishhookImage;
        else if (obs.type === 'shipwheel') img = shipwheelImage;
        else if (obs.type === 'bubble') img = bubbleShieldImage;
        else if (obs.type === 'heart') img = heartImage;

        if (img && img.complete) ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
        else {
            ctx.fillStyle = obs.color; ctx.beginPath();
            ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, obs.width/2, 0, Math.PI * 2); ctx.fill();
        }
    });
}

function drawUI() {
    if (!gameRunning || isDying) return;
    const hs = 40, sp = 30, startX = 20, hy = 25; // Compact UI
    for (let i = 0; i < 10; i++) {
        ctx.save();
        if (i >= lives) ctx.globalAlpha = 0.3;
        if (heartIconImage.complete) ctx.drawImage(heartIconImage, startX + i*sp - hs/2, hy - hs/2, hs, hs);
        ctx.restore();
    }

    const scoreStr = score.toString();
    const dw = 25, dh = 35, sy = hy;
    const lw = 80, lh = 35;
    const lx = canvas.width - 30 - (scoreStr.length * dw) - lw - 10;
    if (scoreLabelImage.complete) ctx.drawImage(scoreLabelImage, lx - lw/2, sy - lh/2, lw, lh);
    scoreStr.split('').forEach((digit, i) => {
        const dx = canvas.width - 30 - ((scoreStr.length - i - 1) * dw);
        const di = parseInt(digit);
        if (numberImages[di].complete) ctx.drawImage(numberImages[di], dx - dw/2, sy - dh/2, dw, dh);
    });
}

function updateGame(deltaTime) {
    if (!gameRunning || gameOver || isDying || isAppInBackground) return;
    if (performance.now() > nextObstacleTime) {
        generateObstacleWave();
        nextObstacleTime = performance.now() + obstacleFrequency;
    }

    const cx = getCurrentClownfishX();
    const ts = deltaTime / FRAME_TIME;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed * ts;
        if (!obs.scored && obs.x + obs.width < cx - CLOWNFISH_WIDTH/2) {
            obs.scored = true;
            if (obs.damage > 0) {
                score++;
                soundSystem.playScoreSound(); // Play "glup" bubble SFX
                if (score >= nextSpeedIncrease && score < 300) {
                    speed *= 1.05;
                    obstacleFrequency = Math.max(500, obstacleFrequency * 0.95);
                    nextSpeedIncrease += 20;
                    
                    // Removed dynamic pitch shift as it causes restarts on some Android devices
                    // soundSystem.setPlaybackRate(newRate);
                }
            }
        }
        if (obs.x + obs.width < -50) { obstacles.splice(i, 1); continue; }

        if (!obs.scored) {
            const collision = (cx + HITBOX_SIZE/2 > obs.x && cx - HITBOX_SIZE/2 < obs.x + obs.width &&
                               clownfishY + HITBOX_SIZE/2 > obs.y && clownfishY - HITBOX_SIZE/2 < obs.y + obs.height);
            if (collision) {
                if (obs.shield) { 
                    shieldActive = true; 
                    shieldHitsRemaining = 3; 
                    soundSystem.playShieldSound();
                }
                else if (obs.damage < 0) {
                    lives = Math.min(10, lives - obs.damage);
                    soundSystem.playLifeSound();
                }
                else {
                    if (shieldActive) { 
                        if (--shieldHitsRemaining <= 0) shieldActive = false; 
                        soundSystem.playShieldSound(); // Reuse shield sound for deflection
                    }
                    else {
                        lives = Math.max(0, lives - obs.damage);
                        isHit = true; 
                        hitStartTime = performance.now();
                        soundSystem.playHitSound();
                        if (lives === 0) { isDying = true; gameRunning = false; break; }
                    }
                }
                obstacles.splice(i, 1);
            }
        }
    }
    clownfishY = Math.max(CLOWNFISH_HEIGHT/2 + 30, Math.min(canvas.height - CLOWNFISH_HEIGHT/2 - 30, clownfishY));
}

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!sharkEntranceComplete) {
        sharkX += SHARK_ENTRANCE_SPEED * (dt / 1000);
        if (sharkX >= 0) { sharkX = 0; sharkEntranceComplete = true; nextObstacleTime = performance.now() + obstacleFrequency; }
    }

    if (isDying) {
        deathProgress += 0.02;
        if (deathProgress >= 1) { gameOverFunction(); return; }
    } else if (gameRunning && !gameOver && sharkEntranceComplete) updateGame(dt);

    drawBackground();
    drawSharkMouth();
    drawObstacles();
    drawClownfish();
    drawUI();
    if ((gameRunning || isDying) && !gameOver) requestAnimationFrame(gameLoop);
}

// Initial draw (will be overwritten by CSS background, but good for canvas state)
updateVolume();

