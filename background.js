chrome.runtime.onInstalled.addListener(() => {
    console.log('MediaSub Player installed');
});

// Listen for commands
chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);
    // In a full implementation, we would query active tabs and send messages
    // to the content script or player tab to toggle playback.
    // For the popup-based player, this is limited unless the popup is open.
});