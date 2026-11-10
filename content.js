// MediaSub content script: draws subtitles over <video> elements on web pages.
// Injected on demand by the popup (activeTab + scripting), so it needs no
// broad host permission. Classic script on purpose: content scripts cannot
// be ES modules, so cues are parsed in the popup and sent here as plain data.
(() => {
    if (window.__mediasubInjected) return;
    window.__mediasubInjected = true;

    const STYLE_ID = 'mediasub-style';
    const state = {
        cues: [],
        name: '',
        overlays: new Map(), // HTMLVideoElement -> { el, cue, hint }
        frameId: 0
    };

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .mediasub-subtitle {
                position: fixed;
                z-index: 2147483647;
                transform: translateX(-50%);
                padding: 0.2em 0.6em;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.6);
                color: #fff;
                font-family: Arial, Helvetica, sans-serif;
                text-align: center;
                text-shadow: 1px 1px 2px #000;
                white-space: pre-line;
                pointer-events: none;
                line-height: 1.3;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Cues come from the popup as plain objects. Drop anything malformed.
    function sanitizeCues(raw) {
        if (!Array.isArray(raw)) return [];
        return raw
            .filter(c => c && Number.isFinite(c.start) && Number.isFinite(c.end) && typeof c.text === 'string')
            .map(c => ({
                start: c.start,
                end: c.end,
                // Strip WebVTT styling tags such as <i> or <c.yellow>; never inject HTML.
                text: c.text.replace(/<[^>]+>/g, '')
            }))
            .sort((a, b) => a.start - b.start);
    }

    // Binary search over cues sorted by start time. Returns the cue active at t, or null.
    function cueAt(t) {
        const cues = state.cues;
        let lo = 0, hi = cues.length - 1, found = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (cues[mid].start <= t) { found = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        // Overlapping cues: walk back from the last cue that started before t.
        for (let i = found; i >= 0; i--) {
            if (t <= cues[i].end) return cues[i];
            if (cues[i].end < t - 60) break; // assume no cue lasts over a minute past its start
        }
        return null;
    }

    function getEntry(video) {
        let entry = state.overlays.get(video);
        if (!entry) {
            ensureStyle();
            const el = document.createElement('div');
            el.className = 'mediasub-subtitle';
            el.style.display = 'none';
            entry = { el, cue: null };
            state.overlays.set(video, entry);
        }
        return entry;
    }

    function removeEntry(video) {
        const entry = state.overlays.get(video);
        if (entry) {
            entry.el.remove();
            state.overlays.delete(video);
        }
    }

    function updateVideo(video, entry) {
        const el = entry.el;
        // In fullscreen only the fullscreen element is visible, so the overlay must live inside it.
        const container = document.fullscreenElement || document.body;
        if (el.parentNode !== container) container.appendChild(el);

        const rect = video.getBoundingClientRect();
        const onScreen = rect.width > 0 && rect.height > 0 &&
            rect.bottom > 0 && rect.top < window.innerHeight &&
            rect.right > 0 && rect.left < window.innerWidth;

        const cue = onScreen && state.cues.length ? cueAt(video.currentTime) : null;
        if (!cue) {
            el.style.display = 'none';
            entry.cue = null;
            return;
        }

        if (entry.cue !== cue) {
            el.textContent = cue.text;
            entry.cue = cue;
        }

        // Scale text with the video, and sit just above its bottom edge.
        const fontSize = Math.min(40, Math.max(14, rect.height / 22));
        el.style.fontSize = fontSize + 'px';
        el.style.maxWidth = Math.max(200, rect.width * 0.9) + 'px';
        el.style.left = (rect.left + rect.width / 2) + 'px';
        el.style.bottom = (window.innerHeight - rect.bottom + rect.height * 0.06) + 'px';
        el.style.display = 'block';
    }

    function tick() {
        state.frameId = 0;
        if (!state.cues.length) return;

        const videos = new Set(document.querySelectorAll('video'));
        // Forget videos that were removed from the page.
        for (const video of state.overlays.keys()) {
            if (!videos.has(video)) removeEntry(video);
        }
        for (const video of videos) {
            updateVideo(video, getEntry(video));
        }
        scheduleTick();
    }

    function scheduleTick() {
        if (!state.frameId && state.cues.length) {
            state.frameId = requestAnimationFrame(tick);
        }
    }

    function clearAll() {
        state.cues = [];
        state.name = '';
        for (const video of [...state.overlays.keys()]) removeEntry(video);
        if (state.frameId) cancelAnimationFrame(state.frameId);
        state.frameId = 0;
    }

    function countVideos() {
        return document.querySelectorAll('video').length;
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('mediasub:')) return false;

        switch (msg.type) {
            case 'mediasub:load':
                state.cues = sanitizeCues(msg.cues);
                state.name = typeof msg.name === 'string' ? msg.name : '';
                scheduleTick();
                break;
            case 'mediasub:clear':
                clearAll();
                break;
        }

        sendResponse({ ok: true, cues: state.cues.length, videos: countVideos(), name: state.name });
        return false;
    });

    // Keep overlays in step when the page scrolls or resizes; the rAF loop covers the rest.
    window.addEventListener('resize', scheduleTick);
    window.addEventListener('scroll', scheduleTick, true);
})();
