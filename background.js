// console.log("background.js");

const defaults = {
    extendColorHorizontally: false,
    individualDifficultyColor: true,
    includeColor2: true,
    color1: "#00FF00",
    color2: "#FFFF00",
    color3: "#FF0000",
    opacity: 50 // 0-100
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("background.js received message:", request);

    if (request.url !== undefined) {
        fetch(request.url)
            .then(response => response.text())
            .then(data => sendResponse(data))
            .catch(error => console.error(error));
        return true;
    }

    else if (request === 'settingsChanged'/* || request === 'contentLoaded'*/) {
        chrome.tabs.query({}, function(tabs) {
            for (let tab of tabs) {
                if (tab.url && tab.url.startsWith('https://www.myworkday.com/scu/')) {
                    chrome.tabs.sendMessage(tab.id, 'settingsChanged', function(response) {
                        if (chrome.runtime.lastError) {} // ignore
                    });
                }
            }
        });
    }

    else if (request === "getDefaults") {
        sendResponse(defaults);
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (tab.url && tab.url.startsWith('https://www.myworkday.com/scu/')) {
            chrome.tabs.sendMessage(activeInfo.tabId, 'settingsChanged', function(response) {
                if (chrome.runtime.lastError) {} // ignore
            });
        }
    });
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install") {
        chrome.storage.sync.set(defaults);
    }
    // else if (details.reason == "update") {}
});