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

document.addEventListener('DOMContentLoaded', function() {
    opacitySlider.oninput = function() {
        opacityValue.value = opacitySlider.value;
    }
    opacityValue.oninput = function() {
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
    includeColor2Checkbox.onchange = function() {
        if (includeColor2Checkbox.checked) {
            color2Selector.disabled = false;
        } else {
            color2Selector.disabled = true;
        }
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
    chrome.storage.sync.get(['extendColorHorizontally', 'individualDifficultyColor', 'includeColor2', 'color1', 'color2', 'color3', 'opacity'], function(data) {
        // console.log('data', data);
        // console.log('defaults', defaults);

        extendColorHorizontallyCheckbox.checked   = data.extendColorHorizontally   !== undefined ? data.extendColorHorizontally   : defaults.extendColorHorizontally;
        individualDifficultyColorCheckbox.checked = data.individualDifficultyColor !== undefined ? data.individualDifficultyColor : defaults.individualDifficultyColor;
        includeColor2Checkbox.checked             = data.includeColor2             !== undefined ? data.includeColor2             : defaults.includeColor2;
        color1Selector.value                      = data.color1                    !== undefined ? data.color1                    : defaults.color1;
        color2Selector.value                      = data.color2                    !== undefined ? data.color2                    : defaults.color2;
        color3Selector.value                      = data.color3                    !== undefined ? data.color3                    : defaults.color3;
        opacitySlider.value                       = data.opacity                   !== undefined ? data.opacity                   : defaults.opacity;
        opacityValue.value                        = data.opacity                   !== undefined ? data.opacity                   : defaults.opacity;

        color2Selector.disabled                   = !includeColor2Checkbox.checked;
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

    opacitySlider.addEventListener('input', function() {
        chrome.storage.sync.set({opacity: this.value});
        chrome.runtime.sendMessage('settingsChanged');
    });

    opacityValue.addEventListener('change', function() {
        console.log('opacityValue changed');
        chrome.storage.sync.set({opacity: this.value});
        chrome.runtime.sendMessage('settingsChanged');
    });

    restoreDefaultsButton.addEventListener('click', function() {
        // console.log('Restoring to defaults');
        // console.log(defaults);
        chrome.storage.sync.set({
            extendColorHorizontally:   defaults.extendColorHorizontally,
            individualDifficultyColor: defaults.individualDifficultyColor,
            includeColor2:             defaults.includeColor2,
            color1:                    defaults.color1,
            color2:                    defaults.color2,
            color3:                    defaults.color3,
            opacity:                   defaults.opacity
        });
        loadSettings();
        chrome.runtime.sendMessage('settingsChanged');
    });
}

setupSettings();