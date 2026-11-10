export class SubtitleManager {
    constructor(overlayElement) {
        this.overlay = overlayElement;
        this.cues = [];
        this.activeCue = null;
        this.enabled = true;
        this.offset = 0; // in seconds
    }

    // Reads a subtitle File and returns its cues. Does not touch the overlay,
    // so it can be used where no overlay exists (e.g. the popup for web pages).
    async parseFile(file) {
        // Normalise line endings and strip a UTF-8 BOM: Windows .srt files use CRLF,
        // which the block parser below would otherwise reject.
        const text = (await file.text()).replace(/^﻿/, '').replace(/\r\n?/g, '\n');

        if (file.name.endsWith('.srt')) return this.parseSRT(text);
        if (file.name.endsWith('.vtt')) return this.parseVTT(text);
        console.error('Unsupported subtitle format');
        return [];
    }

    async load(file) {
        this.cues = await this.parseFile(file);
        this.overlay.classList.add('active');
        console.log(`Loaded ${this.cues.length} subtitle cues`);
    }

    update(currentTime) {
        if (!this.enabled || this.cues.length === 0) {
            this.overlay.textContent = '';
            return;
        }

        const time = currentTime + this.offset;
        
        // Find current cue
        // Simple linear search is fine for typical subtitle files
        // Optimization: Keep track of last index if needed
        const cue = this.cues.find(c => time >= c.start && time <= c.end);

        if (cue !== this.activeCue) {
            this.activeCue = cue;
            if (cue) {
                this.overlay.innerHTML = cue.text.replace(/\n/g, '<br>');
                this.overlay.style.display = 'block';
            } else {
                this.overlay.textContent = '';
                this.overlay.style.display = 'none';
            }
        }
    }

    parseSRT(text) {
        const cues = [];
        const blocks = text.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
            const lines = block.split('\n');
            if (lines.length < 2) continue;

            // Index might be first line, or part of previous logic depending on split
            let timeLineIndex = 0;
            if (lines[0].match(/^\d+$/)) {
                timeLineIndex = 1;
            }

            const timeLine = lines[timeLineIndex];
            if (!timeLine) continue;

            const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
            if (timeMatch) {
                const start = this.timeToSeconds(timeMatch[1].replace(',', '.'));
                const end = this.timeToSeconds(timeMatch[2].replace(',', '.'));
                const text = lines.slice(timeLineIndex + 1).join('\n');
                cues.push({ start, end, text });
            }
        }
        return cues;
    }

    parseVTT(text) {
        const cues = [];
        const lines = text.split('\n');
        let i = 0;
        
        // Skip header
        if (lines[0].startsWith('WEBVTT')) i++;
        while (i < lines.length && lines[i].trim() === '') i++;

        while (i < lines.length) {
            let line = lines[i].trim();
            
            // Skip comments or empty lines
            if (!line || line.startsWith('NOTE')) {
                i++;
                continue;
            }

            // Optional identifier
            if (!line.includes('-->')) {
                i++; // Skip identifier
                if (i >= lines.length) break;
                line = lines[i].trim();
            }

            const timeMatch = line.match(/(\d{2}:)?\d{2}:\d{2}\.\d{3} --> (\d{2}:)?\d{2}:\d{2}\.\d{3}/);
            if (timeMatch) {
                const start = this.timeToSeconds(line.split(' --> ')[0]);
                const end = this.timeToSeconds(line.split(' --> ')[1]);
                
                i++;
                let textLines = [];
                while (i < lines.length && lines[i].trim() !== '') {
                    textLines.push(lines[i]);
                    i++;
                }
                
                cues.push({ start, end, text: textLines.join('\n') });
            } else {
                i++;
            }
        }
        return cues;
    }

    timeToSeconds(timeStr) {
        const parts = timeStr.split(':');
        let seconds = 0;
        let minutes = 0;
        let hours = 0;

        if (parts.length === 3) {
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
            seconds = parseFloat(parts[2]);
        } else if (parts.length === 2) {
            minutes = parseInt(parts[0]);
            seconds = parseFloat(parts[1]);
        }
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.overlay.style.display = 'none';
        }
    }
}