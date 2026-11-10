# MediaSub Player - Chrome Extension [PROTOTYPE]

A local media player for Chrome with subtitle support (.srt, .vtt), Picture-in-Picture mode, and modern playback controls.

## Features
- Play local video and audio files
- Load external subtitles (.srt, .vtt)
- Modern dark theme UI
- Picture-in-Picture (Mini Player) mode
- Keyboard shortcuts
- Playback speed control

## Installation
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select this folder (`MediaSub-extension`).
5. The **MediaSub Player** icon should appear in your toolbar.

## Usage
1. Click the extension icon to open the player.
2. Drag and drop a video file, or click "Select Media File".
3. Use the **S** key or the subtitle icon to load a subtitle file.
4. Use **P** for Picture-in-Picture mode.
5. Use **Space** to Play/Pause.

## Subtitles for Videos on Web Pages
1. Open a page with a video and let it load.
2. Click the extension icon and choose **Load Subtitles for Page Video**.
3. Pick an `.srt` or `.vtt` file. Subtitles appear over the page's video, follow seeks, and stay in fullscreen.

Notes:
- The extension only runs on a page when you load subtitles there (via `activeTab`). It does not read or change pages in the background.
- Subtitles stay until you reload the page.
- Subtitles are drawn over the video, so they are not visible in Picture-in-Picture windows.

## Keyboard Shortcuts
- **Space**: Play/Pause
- **Arrow Left/Right**: Seek -/+ 10s
- **Arrow Up/Down**: Volume +/-
- **M**: Mute
- **F**: Fullscreen
- **P**: Picture-in-Picture
- **S**: Load Subtitles
