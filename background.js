chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    fetch(request.url)
        .then(response => response.text())
        .then(data => sendResponse(data))
        .catch(error => console.error(error));
    return true;  // Will respond asynchronously.
});