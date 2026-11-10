import { icons } from './icons.js';
import { SubtitleManager } from './subtitle-manager.js';

class MediaPlayer {
    constructor() {
        this.video = document.getElementById('main-video');
        this.subtitleManager = new SubtitleManager(document.getElementById('subtitle-overlay'));
        
        this.initUI();
        this.bindEvents();
        this.setupKeyboardShortcuts();
    }

    initUI() {
        // Inject icons
        document.querySelectorAll('[data-icon]').forEach(el => {
            const iconName = el.dataset.icon;
            if (icons[iconName]) {
                el.innerHTML = icons[iconName];
            }
        });

        // Button icons
        document.getElementById('play-pause-btn').innerHTML = icons.play;
        document.getElementById('mute-btn').innerHTML = icons.volume;
        document.getElementById('pip-btn').innerHTML = icons.pip;
        document.getElementById('fullscreen-btn').innerHTML = icons.maximize;
    }

    bindEvents() {
        // File Inputs
        document.getElementById('media-input').addEventListener('change', (e) => this.handleMediaFile(e.target.files[0]));
        document.getElementById('subtitle-input').addEventListener('change', (e) => this.handleSubtitleFile(e.target.files[0]));

        // Drag & Drop
        const dropZone = document.getElementById('landing-state');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleDrop(e.dataTransfer.files);
        });

        // Video Events
        this.video.addEventListener('timeupdate', () => this.handleTimeUpdate());
        this.video.addEventListener('loadedmetadata', () => this.handleMetadata());
        this.video.addEventListener('ended', () => this.handleEnded());
        this.video.addEventListener('click', () => this.togglePlay());

        // Controls
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('seek-bar').addEventListener('input', (e) => this.handleSeek(e.target.value));
        document.getElementById('volume-bar').addEventListener('input', (e) => this.handleVolume(e.target.value));
        document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());
        document.getElementById('pip-btn').addEventListener('click', () => this.togglePiP());
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
    }

    handleDrop(files) {
        const mediaFile = Array.from(files).find(f => f.type.startsWith('video/') || f.type.startsWith('audio/'));
        const subFile = Array.from(files).find(f => f.name.endsWith('.srt') || f.name.endsWith('.vtt'));

        if (mediaFile) this.handleMediaFile(mediaFile);
        if (subFile) this.handleSubtitleFile(subFile);
    }

    handleMediaFile(file) {
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        this.video.src = url;
        
        document.getElementById('landing-state').classList.add('hidden');
        document.getElementById('player-state').classList.remove('hidden');
        
        this.video.play().catch(e => console.log('Autoplay prevented', e));
        this.updatePlayButton(true);
    }

    handleSubtitleFile(file) {
        if (!file) return;
        this.subtitleManager.load(file);
    }

    handleTimeUpdate() {
        const current = this.video.currentTime;
        const duration = this.video.duration || 0;
        
        document.getElementById('seek-bar').value = current;
        document.getElementById('current-time').textContent = this.formatTime(current);
        
        this.subtitleManager.update(current);
    }

    handleMetadata() {
        const duration = this.video.duration;
        document.getElementById('seek-bar').max = duration;
        document.getElementById('duration').textContent = this.formatTime(duration);
    }

    handleEnded() {
        this.updatePlayButton(false);
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play();
            this.updatePlayButton(true);
        } else {
            this.video.pause();
            this.updatePlayButton(false);
        }
    }

    updatePlayButton(isPlaying) {
        const btn = document.getElementById('play-pause-btn');
        btn.innerHTML = isPlaying ? icons.pause : icons.play;
    }

    handleSeek(time) {
        this.video.currentTime = parseFloat(time);
    }

    handleVolume(value) {
        this.video.volume = parseFloat(value);
        this.video.muted = false;
        this.updateVolumeIcon();
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const btn = document.getElementById('mute-btn');
        if (this.video.muted || this.video.volume === 0) {
            btn.innerHTML = icons.volumeMute;
        } else {
            btn.innerHTML = icons.volume;
        }
    }

    async togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (this.video.readyState !== 0) {
                await this.video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('PiP failed:', error);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.getElementById('player-container').requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT') return;

            switch(e.code) {
                case 'Space':
                case 'k':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    this.handleSeek(this.video.currentTime - 10);
                    break;
                case 'ArrowRight':
                    this.handleSeek(this.video.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.video.volume = Math.min(1, this.video.volume + 0.1);
                    document.getElementById('volume-bar').value = this.video.volume;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.video.volume = Math.max(0, this.video.volume - 0.1);
                    document.getElementById('volume-bar').value = this.video.volume;
                    break;
                case 'KeyM':
                    this.toggleMute();
                    break;
                case 'KeyF':
                    this.toggleFullscreen();
                    break;
                case 'KeyP':
                    this.togglePiP();
                    break;
                case 'KeyS':
                    document.getElementById('subtitle-input').click();
                    break;
            }
        });
    }
}

// Web-page subtitles: parse the file here (ES modules are allowed in the popup),
// then hand plain cue data to content.js running in the active tab.
const PAGE_MESSAGE = (type, payload = {}) => ({ type: `mediasub:${type}`, ...payload });

async function sendToActiveTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) throw new Error('No active tab found.');

    try {
        return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
        // The content script is not on this page yet (it is injected on demand, not on every page).
        await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js']
        });
        return await chrome.tabs.sendMessage(tab.id, message);
    }
}

function setWebStatus(text, isError = false) {
    const el = document.getElementById('web-status');
    el.textContent = text;
    el.classList.toggle('error', isError);
}

function initWebSubtitles() {
    const input = document.getElementById('web-subtitle-input');
    const parser = new SubtitleManager(null);

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = ''; // allow choosing the same file again
        if (!file) return;

        if (!/\.(srt|vtt)$/i.test(file.name)) {
            setWebStatus('Choose a .srt or .vtt file.', true);
            return;
        }

        try {
            const cues = await parser.parseFile(file);
            if (cues.length === 0) {
                setWebStatus(`No subtitle cues found in ${file.name}.`, true);
                return;
            }
            const res = await sendToActiveTab(PAGE_MESSAGE('load', { cues, name: file.name }));
            if (!res || !res.ok) throw new Error('The page did not accept the subtitles.');
            setWebStatus(
                `${cues.length} cues loaded from ${file.name}. ` +
                (res.videos > 0
                    ? `Found ${res.videos} video${res.videos === 1 ? '' : 's'} on this page.`
                    : 'No video found on this page yet. Subtitles show once one plays.')
            );
        } catch (err) {
            console.error('Web subtitle load failed:', err);
            setWebStatus(`Could not load subtitles on this page: ${err.message}`, true);
        }
    });
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new MediaPlayer();
    initWebSubtitles();
});