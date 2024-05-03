// console.log("popup.js");

let extendColorHorizontallyCheckbox = document.getElementById('extendColorHorizontallyCheckbox');
let individualDifficultyColorCheckbox = document.getElementById('individualDifficultyColorCheckbox');
let includeColor2Checkbox = document.getElementById('includeColor2Checkbox');
let color1Selector = document.getElementById('color1Selector');
let color2Selector = document.getElementById('color2Selector');
let color3Selector = document.getElementById('color3Selector');

let extendColorHorizontally;
let individualDifficultyColor;
let includeColor2;
let color1;
let color2;
let color3;

let defaults;

async function getDefaults() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage('getDefaults', function(response) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}
  
function loadSettings() {
    chrome.storage.sync.get(['extendColorHorizontally', 'individualDifficultyColor', 'includeColor2', 'color1', 'color2', 'color3'], function(data) {
        // console.log('data', data);
        // console.log('defaults', defaults);

        extendColorHorizontally = data.extendColorHorizontally || defaults.extendColorHorizontallyDefault;
        individualDifficultyColor = data.individualDifficultyColor || defaults.individualDifficultyColorDefault;
        includeColor2 = data.includeColor2 || defaults.includeColor2Default;
        color1 = data.color1 || defaults.color1Default;
        color2 = data.color2 || defaults.color2Default;
        color3 = data.color3 || defaults.color3Default;

        extendColorHorizontallyCheckbox.checked = extendColorHorizontally;
        individualDifficultyColorCheckbox.checked = individualDifficultyColor;
        includeColor2Checkbox.checked = includeColor2;
        color1Selector.value = color1;
        color2Selector.value = color2;
        color3Selector.value = color3;

        // console.log('Loaded settings:', extendColorHorizontally, individualDifficultyColor, includeColor2, color1, color2, color3);
    });
}

async function setupSettings() {
    defaults = await getDefaults();

    loadSettings();

    extendColorHorizontallyCheckbox.addEventListener('change', function() {
        extendColorHorizontally = this.checked;
        chrome.storage.sync.set({extendColorHorizontally: extendColorHorizontally});
        chrome.runtime.sendMessage('settingsChanged');
    });
    
    individualDifficultyColorCheckbox.addEventListener('change', function() {
        individualDifficultyColor = this.checked;
        chrome.storage.sync.set({individualDifficultyColor: individualDifficultyColor});
        chrome.runtime.sendMessage('settingsChanged');
    });
    
    includeColor2Checkbox.addEventListener('change', function() {
        includeColor2 = this.checked;
        chrome.storage.sync.set({includeColor2: includeColor2});
        chrome.runtime.sendMessage('settingsChanged');
    });
    
    color1Selector.addEventListener('change', function() {
        color1 = this.value;
        chrome.storage.sync.set({color1: color1});
        chrome.runtime.sendMessage('settingsChanged');
    });
    
    color2Selector.addEventListener('change', function() {
        color2 = this.value;
        chrome.storage.sync.set({color2: color2});
        chrome.runtime.sendMessage('settingsChanged');
    });
    
    color3Selector.addEventListener('change', function() {
        color3 = this.value;
        chrome.storage.sync.set({color3: color3});
        chrome.runtime.sendMessage('settingsChanged');
    });
}

setupSettings();