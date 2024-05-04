<<<<<<< Updated upstream
const extendColorHorizontallyDefault = false;
const individualDifficultyColorDefault = false;
const includeColor2Default = true;
const color1Default = "#00FF00";
const color2Default = "#FFFF00";
const color3Default = "#FF0000";

=======
>>>>>>> Stashed changes
// console.log("background.js");

const extendColorHorizontallyDefault   = false;
const individualDifficultyColorDefault = true;
const reverseColorDefault              = false;
const includeColor2Default             = true;
const color1Default                    = "#00FF00";
const color2Default                    = "#FFFF00";
const color3Default                    = "#FF0000";
const opacityDefault                   = 50;

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
        sendResponse({
            extendColorHorizontally:   extendColorHorizontallyDefault,
            individualDifficultyColor: individualDifficultyColorDefault,
            reverseColor:              reverseColorDefault,
            includeColor2:             includeColor2Default,
            color1:                    color1Default,
            color2:                    color2Default,
            color3:                    color3Default,
            opacity:                   opacityDefault
        });
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
        chrome.storage.sync.set({
            extendColorHorizontally:   extendColorHorizontallyDefault,
            individualDifficultyColor: individualDifficultyColorDefault,
            reverseColor:              reverseColorDefault,
            includeColor2:             includeColor2Default,
            color1:                    color1Default,
            color2:                    color2Default,
            color3:                    color3Default,
            opacity:                   opacityDefault
        });
    }
    // else if (details.reason == "update") {}
});