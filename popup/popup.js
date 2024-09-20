// console.log("popup.js");

let extendColorHorizontallyCheckbox   = document.getElementById('extendColorHorizontallyCheckbox'  );
let individualDifficultyColorCheckbox = document.getElementById('individualDifficultyColorCheckbox');
let includeColor2Checkbox             = document.getElementById('includeColor2Checkbox'            );
let color1Selector                    = document.getElementById('color1Selector'                   );
let color2Selector                    = document.getElementById('color2Selector'                   );
let color3Selector                    = document.getElementById('color3Selector'                   );
let restoreDefaultsButton             = document.getElementById('restoreDefaultsButton'            );
let opacitySlider                     = document.getElementById('opacitySlider'                    );
let opacityValue                      = document.getElementById('opacityValue'                     );
let authorizationButton               = document.getElementById('authorizationButton');
let useEvalsCheckbox                  = document.getElementById('useEvalsCheckbox');

document.addEventListener('DOMContentLoaded', function() {
    function validateOpacityInput() {
        // Validate the input value
        let value = parseInt(opacityValue.value, 10);
        if (isNaN(value)) {
            value = defaults.opacity !== undefined ? defaults.opacity : 50;
        } else if (value < 0) {
            value = 0;
        } else if (value > 100) {
            value = 100;
        }
        opacityValue.value = value;
        opacitySlider.value = value;
    }
    
    opacityValue.oninput = function() {
        // Allow any input value temporarily
        let value = opacityValue.value;
        if (value !== '' && !isNaN(value)) {
            let numericValue = parseInt(value, 10);
            if (numericValue >= 0 && numericValue <= 100) {
                opacitySlider.value = numericValue;
            }
        }
    }
    
    opacityValue.onblur = validateOpacityInput;
    
    opacityValue.onkeydown = function(event) {
        if (event.key === 'Enter') {
            validateOpacityInput();
            opacityValue.blur(); // Optionally remove focus from the input
        }
    }
    
    includeColor2Checkbox.onchange = function() {
        color2Selector.disabled = !includeColor2Checkbox.checked;
    }
});

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
    chrome.storage.sync.get(['extendColorHorizontally', 'individualDifficultyColor', 'includeColor2', 'color1', 'color2', 'color3', 'opacity', 'useEvals', 'oauth_token'], function(data) {
        // console.log('data', data); // DEBUG
        // console.log('defaults', defaults); // DEBUG

        extendColorHorizontallyCheckbox.checked   = data.extendColorHorizontally   !== undefined ? data.extendColorHorizontally   : defaults.extendColorHorizontally;
        individualDifficultyColorCheckbox.checked = data.individualDifficultyColor !== undefined ? data.individualDifficultyColor : defaults.individualDifficultyColor;
        includeColor2Checkbox.checked             = data.includeColor2             !== undefined ? data.includeColor2             : defaults.includeColor2;
        color1Selector.value                      = data.color1                    !== undefined ? data.color1                    : defaults.color1;
        color2Selector.value                      = data.color2                    !== undefined ? data.color2                    : defaults.color2;
        color3Selector.value                      = data.color3                    !== undefined ? data.color3                    : defaults.color3;
        opacitySlider.value                       = data.opacity                   !== undefined ? data.opacity                   : defaults.opacity;
        opacityValue.value                        = data.opacity                   !== undefined ? data.opacity                   : defaults.opacity;
        useEvalsCheckbox.checked                  = data.useEvals                  !== undefined ? data.useEvals                  : defaults.useEvals;

        color2Selector.disabled                   = !includeColor2Checkbox.checked;
        authorizationButton.disabled              = data.oauth_token !== undefined;
        useEvalsCheckbox.disabled                 = data.oauth_token === undefined;
        // console.log('Loaded settings:', extendColorHorizontally, individualDifficultyColor, includeColor2, color1, color2, color3); // DEBUG
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
        chrome.storage.sync.set({individualDifficultyColor: this.checked});
        chrome.runtime.sendMessage('settingsChanged');
    });
    
    includeColor2Checkbox.addEventListener('change', function() {
        includeColor2 = this.checked;
        color2Selector.disabled = !includeColor2;
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
        chrome.storage.sync.set({color3: this.value});
        chrome.runtime.sendMessage('settingsChanged');
    });

    opacitySlider.addEventListener('mouseup', function() {
        opacityValue.value = this.value;
        chrome.storage.sync.set({opacity: this.value});
        chrome.runtime.sendMessage('settingsChanged');
    });

    opacityValue.addEventListener('change', function() {
        // console.log('opacityValue changed'); // DEBUG
        chrome.storage.sync.set({opacity: this.value});
        chrome.runtime.sendMessage('settingsChanged');
    });

    authorizationButton.addEventListener('click', function() {
        chrome.runtime.sendMessage('authorize', ([authorized, failStatus]) => {
            if (authorized) {
                chrome.runtime.sendMessage('downloadEvals', () => {
                    useEvalsCheckbox.checked = true;
                    chrome.storage.sync.set({useEvals: true});
                    chrome.runtime.sendMessage('settingsChanged');
                });
            }
        });
    });

    useEvalsCheckbox.addEventListener('change', function() {
        chrome.storage.sync.set({useEvals: this.checked});
        chrome.runtime.sendMessage('settingsChanged');
    });

    restoreDefaultsButton.addEventListener('click', function() {
        // console.log('Restoring to defaults'); // DEBUG
        // console.log(defaults); // DEBUG
        chrome.storage.sync.set({
            extendColorHorizontally:   defaults.extendColorHorizontally,
            individualDifficultyColor: defaults.individualDifficultyColor,
            includeColor2:             defaults.includeColor2,
            color1:                    defaults.color1,
            color2:                    defaults.color2,
            color3:                    defaults.color3,
            opacity:                   defaults.opacity,
            useEvals:                  defaults.useEvals
        });
        loadSettings();
        chrome.runtime.sendMessage('settingsChanged');
    });
}

setupSettings();