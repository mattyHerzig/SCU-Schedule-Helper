const extendColorHorizontallyDefault = false;
const individualDifficultyColorDefault = false;
const includeColor2Default = true;
const color1Default = "#00FF00";
const color2Default = "#FFFF00";
const color3Default = "#FF0000";

// console.log("background.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("background.js received message:", request);

    if (request.url !== undefined) {
        fetch(request.url)
            .then(response => response.text())
            .then(data => sendResponse(data))
            .catch(error => console.error(error));
        return true;
    }

    else if (request === 'contentLoaded' || request === 'settingsChanged') {
        chrome.windows.getCurrent({populate: true}, function(window) {
            let currentTab = window.tabs.find(tab => tab.active);
            if (currentTab) {
                chrome.tabs.sendMessage(currentTab.id, 'settingsChanged');
            }
        });

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, 'settingsChanged');
            }
        });

        chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, 'settingsChanged');
            }
        });
    }

    else if (request === "getDefaults") {
        sendResponse({
            extendColorHorizontally: extendColorHorizontallyDefault,
            individualDifficultyColor: individualDifficultyColorDefault,
            includeColor2: includeColor2Default,
            color1: color1Default,
            color2: color2Default,
            color3: color3Default
        });
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.sendMessage(activeInfo.tabId, 'settingsChanged');
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install") {
        chrome.storage.sync.set({
            extendColorHorizontally: extendColorHorizontallyDefault,
            individualDifficultyColor: individualDifficultyColorDefault,
            includeColor2: includeColor2Default,
            color1: color1Default,
            color2: color2Default,
            color3: color3Default
        });
    }
    // else if (details.reason == "update") {}
});