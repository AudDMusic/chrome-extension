/*// Service worker sent us the stream ID, use it to get the stream
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: request.streamId
            }
        }
    })
    .then((stream) => {
        // Once we're here, the audio in the tab is muted
        // However, recording the audio works!
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (e) => {
            chunks.push(e.data);
        };
        recorder.onstop = (e) => saveToFile(new Blob(chunks), "test.wav");
        recorder.start();
        setTimeout(() => recorder.stop(), 5000);
    });
});

function saveToFile(blob, name) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}*/