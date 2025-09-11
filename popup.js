let userFavorites = {
    hl: [],
    gl: [],
    lr: [],
    cr: []
};

let userPresets = {};

async function loadFavorites() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['favorites'], (result) => {
            if (result.favorites) {
                userFavorites = result.favorites;
            } else {
                // Use default favorites for first-time
                userFavorites = DEFAULT_FAVORITES;
            }
            resolve();
        });
    });
}

function saveFavorites() {
    chrome.storage.sync.set({ favorites: userFavorites });
}

async function loadPresets() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['presets'], (result) => {
            if (result.presets) {
                userPresets = result.presets;
            } else {
                // Use default presets for first-time
                userPresets = DEFAULT_PRESETS;
            }
            resolve();
        });
    });
}

function savePresets() {
    chrome.storage.sync.set({ presets: userPresets });
}

// Apply preset to current settings
function applyPreset(presetId) {
    if (!userPresets[presetId]) return;

    const preset = userPresets[presetId];
    const params = preset.params;

    // Get dropdown elements
    const hlSelect = document.getElementById('hlSelect');
    const glSelect = document.getElementById('glSelect');
    const lrSelect = document.getElementById('lrSelect');
    const crSelect = document.getElementById('crSelect');

    // Add unknown values to dropdowns if needed
    addUnknownValueOption(hlSelect, params.hl, LANGUAGES);
    addUnknownValueOption(glSelect, params.gl, COUNTRIES);
    addUnknownValueOption(lrSelect, params.lr, LR_LANGUAGES);
    addUnknownValueOption(crSelect, params.cr, CR_COUNTRIES);

    // Update dropdowns
    hlSelect.value = params.hl || '';
    glSelect.value = params.gl || '';
    lrSelect.value = params.lr || '';
    crSelect.value = params.cr || '';

    updateStarButtons();
}

// Show custom modal for preset name input
function showPresetModal() {
    const hlValue = document.getElementById('hlSelect').value;
    const glValue = document.getElementById('glSelect').value;
    const lrValue = document.getElementById('lrSelect').value;
    const crValue = document.getElementById('crSelect').value;

    // Generate suggested name
    const hlName = hlValue ? (LANGUAGES[hlValue] || hlValue) : 'Default';
    const glName = glValue ? (COUNTRIES[glValue] || glValue) : 'Default';
    const suggestedName = `${hlName} (${glName})`;

    // Set suggested name and show modal
    const input = document.getElementById('presetNameInput');
    input.value = suggestedName;
    document.getElementById('presetModal').style.display = 'flex';

    // Focus input and select all text
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

// Save current settings as new preset
function saveCurrentAsPreset() {
    const presetNameInput = document.getElementById('presetNameInput');
    const presetName = presetNameInput.value.trim();

    if (!presetName) return;

    const hlValue = document.getElementById('hlSelect').value;
    const glValue = document.getElementById('glSelect').value;
    const lrValue = document.getElementById('lrSelect').value;
    const crValue = document.getElementById('crSelect').value;

    // Generate unique ID
    const presetId = 'preset_' + Date.now();

    userPresets[presetId] = {
        name: presetName,
        params: {
            hl: hlValue,
            gl: glValue,
            lr: lrValue,
            cr: crValue
        }
    };

    savePresets();
    populatePresets();

    // Select the newly created preset
    document.getElementById('presetSelect').value = presetId;

    // Hide modal
    hidePresetModal();
}

function hidePresetModal() {
    document.getElementById('presetModal').style.display = 'none';
    document.getElementById('presetNameInput').value = '';
}

// Add unknown value as option at the end of list
function addUnknownValueOption(selectElement, value, knownValues) {
    if (!value || knownValues[value]) return; // Skip if empty or known

    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value} (custom)`;
    option.style.fontStyle = 'italic';
    option.style.color = '#f57c00';
    option.dataset.isCustom = 'true';

    // Add at the end to clearly separate from regular options
    selectElement.appendChild(option);
}

function showDeleteModal() {
    const presetSelect = document.getElementById('presetSelect');
    const selectedPresetId = presetSelect.value;

    if (!selectedPresetId) return;

    const presetName = userPresets[selectedPresetId]?.name;
    document.getElementById('deleteMessage').textContent = `Delete preset "${presetName}"?`;
    document.getElementById('deleteModal').style.display = 'flex';
}

function deleteSelectedPreset() {
    const presetSelect = document.getElementById('presetSelect');
    const selectedPresetId = presetSelect.value;

    if (!selectedPresetId) return;

    delete userPresets[selectedPresetId];
    savePresets();
    populatePresets();
    hideDeleteModal();
}

function hideDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

function populatePresets() {
    const presetSelect = document.getElementById('presetSelect');
    const defaultText = chrome.i18n.getMessage('selectPreset') || 'Select preset...';

    // Clear existing options
    presetSelect.replaceChildren();

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultText;
    presetSelect.appendChild(defaultOption);

    // Add user presets
    Object.entries(userPresets).forEach(([presetId, preset]) => {
        const option = document.createElement('option');
        option.value = presetId;
        option.textContent = preset.name;
        presetSelect.appendChild(option);
    });
}

function toggleFavorite(selectType, code) {
    const favArray = userFavorites[selectType];
    const index = favArray.indexOf(code);

    if (index > -1) {
        favArray.splice(index, 1);
    } else {
        favArray.push(code);
    }

    saveFavorites();
    populateSelects();
}

function createOptionWithStar(value, text, type, isFavorite = false) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${isFavorite ? '⭐' : ''} ${text} - ${value}`;
    option.dataset.type = type;
    option.dataset.code = value;
    option.dataset.favorite = isFavorite;
    return option;
}

function populateSelects() {
    // Save current selections
    const currentHl = document.getElementById('hlSelect').value;
    const currentGl = document.getElementById('glSelect').value;
    const currentLr = document.getElementById('lrSelect').value;
    const currentCr = document.getElementById('crSelect').value;

    populateLanguageSelects();
    populateCountrySelects();

    // Restore current selections
    document.getElementById('hlSelect').value = currentHl;
    document.getElementById('glSelect').value = currentGl;
    document.getElementById('lrSelect').value = currentLr;
    document.getElementById('crSelect').value = currentCr;
}

function populateLanguageSelects() {
    const hlSelect = document.getElementById('hlSelect');
    const lrSelect = document.getElementById('lrSelect');

    // Get localized default value text
    const defaultText = chrome.i18n.getMessage('defaultValue');

    // Clear existing options (keep default)
    hlSelect.replaceChildren();
    lrSelect.replaceChildren();

    // Add default option for HL
    const hlDefaultOption = document.createElement('option');
    hlDefaultOption.value = '';
    hlDefaultOption.setAttribute('data-i18n', 'defaultValue');
    hlDefaultOption.textContent = defaultText;
    hlSelect.appendChild(hlDefaultOption);

    // Add default option for LR
    const lrDefaultOption = document.createElement('option');
    lrDefaultOption.value = '';
    lrDefaultOption.setAttribute('data-i18n', 'defaultValue');
    lrDefaultOption.textContent = defaultText;
    lrSelect.appendChild(lrDefaultOption);

    // Add HL favorites first
    userFavorites.hl.forEach(code => {
        if (LANGUAGES[code]) {
            hlSelect.appendChild(createOptionWithStar(code, LANGUAGES[code], 'hl', true));
        }
    });

    // Add LR favorites first
    userFavorites.lr.forEach(langCode => {
        if (LR_LANGUAGES[langCode]) {
            lrSelect.appendChild(createOptionWithStar(langCode, `${LR_LANGUAGES[langCode]} only`, 'lr', true));
        }
    });

    // Add separators if there are favorites
    if (userFavorites.hl.length > 0) {
        const separator1 = document.createElement('option');
        separator1.disabled = true;
        separator1.textContent = '─────────────────';
        hlSelect.appendChild(separator1);
    }

    if (userFavorites.lr.length > 0) {
        const separator2 = document.createElement('option');
        separator2.disabled = true;
        separator2.textContent = '─────────────────';
        lrSelect.appendChild(separator2);
    }

    // Add all other languages
    Object.entries(LANGUAGES).forEach(([code, name]) => {
        if (!userFavorites.hl.includes(code)) {
            hlSelect.appendChild(createOptionWithStar(code, name, 'hl', false));
        }
    });

    // Add all other LR languages
    Object.entries(LR_LANGUAGES).forEach(([langCode, name]) => {
        if (!userFavorites.lr.includes(langCode)) {
            lrSelect.appendChild(createOptionWithStar(langCode, `${name} only`, 'lr', false));
        }
    });
}

function populateCountrySelects() {
    const glSelect = document.getElementById('glSelect');
    const crSelect = document.getElementById('crSelect');

    // Get localized default value text
    const defaultText = chrome.i18n.getMessage('defaultValue');

    // Clear existing options (keep default)
    glSelect.replaceChildren();
    crSelect.replaceChildren();

    // Add default option for GL
    const glDefaultOption = document.createElement('option');
    glDefaultOption.value = '';
    glDefaultOption.setAttribute('data-i18n', 'defaultValue');
    glDefaultOption.textContent = defaultText;
    glSelect.appendChild(glDefaultOption);

    // Add default option for CR
    const crDefaultOption = document.createElement('option');
    crDefaultOption.value = '';
    crDefaultOption.setAttribute('data-i18n', 'defaultValue');
    crDefaultOption.textContent = defaultText;
    crSelect.appendChild(crDefaultOption);

    // Add GL favorites first
    userFavorites.gl.forEach(code => {
        if (COUNTRIES[code]) {
            glSelect.appendChild(createOptionWithStar(code, COUNTRIES[code], 'gl', true));
        }
    });

    // Add CR favorites first
    userFavorites.cr.forEach(countryCode => {
        if (CR_COUNTRIES[countryCode]) {
            crSelect.appendChild(createOptionWithStar(countryCode, `${CR_COUNTRIES[countryCode]} sites only`, 'cr', true));
        }
    });

    // Add separators if there are favorites
    if (userFavorites.gl.length > 0) {
        const separator1 = document.createElement('option');
        separator1.disabled = true;
        separator1.textContent = '─────────────────';
        glSelect.appendChild(separator1);
    }

    if (userFavorites.cr.length > 0) {
        const separator2 = document.createElement('option');
        separator2.disabled = true;
        separator2.textContent = '─────────────────';
        crSelect.appendChild(separator2);
    }

    // Add all other countries
    Object.entries(COUNTRIES).forEach(([code, name]) => {
        if (!userFavorites.gl.includes(code)) {
            glSelect.appendChild(createOptionWithStar(code, name, 'gl', false));
        }
    });

    // Add all other CR countries
    Object.entries(CR_COUNTRIES).forEach(([countryCode, name]) => {
        if (!userFavorites.cr.includes(countryCode)) {
            crSelect.appendChild(createOptionWithStar(countryCode, `${name} sites only`, 'cr', false));
        }
    });
}

function addStarButtonHandlers() {
    // HL star button
    const hlStar = document.getElementById('hlStar');
    if (hlStar) {
        hlStar.addEventListener('click', () => {
            const hlSelect = document.getElementById('hlSelect');
            const selectedOption = hlSelect.options[hlSelect.selectedIndex];
            if (selectedOption && selectedOption.value) {
                let code = selectedOption.value;
                if (LANGUAGES[code]) {
                    toggleFavorite('hl', code);
                    updateStarButtons();
                }
            }
        });
    }

    // LR star button
    const lrStar = document.getElementById('lrStar');
    if (lrStar) {
        lrStar.addEventListener('click', () => {
            const lrSelect = document.getElementById('lrSelect');
            const selectedOption = lrSelect.options[lrSelect.selectedIndex];
            if (selectedOption && selectedOption.value) {
                let langCode = selectedOption.value;
                if (LR_LANGUAGES[langCode]) {
                    toggleFavorite('lr', langCode);
                    updateStarButtons();
                }
            }
        });
    }

    // GL star button
    const glStar = document.getElementById('glStar');
    if (glStar) {
        glStar.addEventListener('click', () => {
            const glSelect = document.getElementById('glSelect');
            const selectedOption = glSelect.options[glSelect.selectedIndex];
            if (selectedOption && selectedOption.value) {
                let code = selectedOption.value;
                if (COUNTRIES[code]) {
                    toggleFavorite('gl', code);
                    updateStarButtons();
                }
            }
        });
    }

    // CR star button
    const crStar = document.getElementById('crStar');
    if (crStar) {
        crStar.addEventListener('click', () => {
            const crSelect = document.getElementById('crSelect');
            const selectedOption = crSelect.options[crSelect.selectedIndex];
            if (selectedOption && selectedOption.value) {
                let countryCode = selectedOption.value;
                if (CR_COUNTRIES[countryCode]) {
                    toggleFavorite('cr', countryCode);
                    updateStarButtons();
                }
            }
        });
    }
}

function updateStarButtons() {
    // HL star
    const hlSelect = document.getElementById('hlSelect');
    const hlStar = document.getElementById('hlStar');
    if (hlSelect && hlStar) {
        const selectedOption = hlSelect.options[hlSelect.selectedIndex];
        const code = selectedOption?.value;
        if (code && LANGUAGES[code] && userFavorites.hl.includes(code)) {
            hlStar.classList.remove('inactive');
            hlStar.title = 'Remove from favorites';
        } else {
            hlStar.classList.add('inactive');
            hlStar.title = 'Add to favorites';
        }
    }

    // LR star
    const lrSelect = document.getElementById('lrSelect');
    const lrStar = document.getElementById('lrStar');
    if (lrSelect && lrStar) {
        const selectedOption = lrSelect.options[lrSelect.selectedIndex];
        const langCode = selectedOption?.value;
        if (langCode && userFavorites.lr.includes(langCode)) {
            lrStar.classList.remove('inactive');
            lrStar.title = 'Remove from favorites';
        } else {
            lrStar.classList.add('inactive');
            lrStar.title = 'Add to favorites';
        }
    }

    // GL star
    const glSelect = document.getElementById('glSelect');
    const glStar = document.getElementById('glStar');
    if (glSelect && glStar) {
        const selectedOption = glSelect.options[glSelect.selectedIndex];
        const code = selectedOption?.value;
        if (code && COUNTRIES[code] && userFavorites.gl.includes(code)) {
            glStar.classList.remove('inactive');
            glStar.title = 'Remove from favorites';
        } else {
            glStar.classList.add('inactive');
            glStar.title = 'Add to favorites';
        }
    }

    // CR star
    const crSelect = document.getElementById('crSelect');
    const crStar = document.getElementById('crStar');
    if (crSelect && crStar) {
        const selectedOption = crSelect.options[crSelect.selectedIndex];
        const countryCode = selectedOption?.value;
        if (countryCode && userFavorites.cr.includes(countryCode)) {
            crStar.classList.remove('inactive');
            crStar.title = 'Remove from favorites';
        } else {
            crStar.classList.add('inactive');
            crStar.title = 'Add to favorites';
        }
    }
}

// Add change listeners to update star buttons
function addSelectChangeHandlers() {
    ['hlSelect', 'glSelect', 'lrSelect', 'crSelect'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', updateStarButtons);
        }
    });
}

// Initialize i18n and tab info
document.addEventListener('DOMContentLoaded', async () => {
    // Load favorites and presets first
    await loadFavorites();
    await loadPresets();

    // Populate selects with favorites
    populateSelects();

    // Populate presets dropdown
    populatePresets();

    // Add star button handlers
    addStarButtonHandlers();

    // Add select change handlers
    addSelectChangeHandlers();

    // Replace all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        element.textContent = message;
    });

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];

        // Check if it's a Google page
        if (!currentTab.url.includes('google.co')) {
            document.getElementById('currentSettings').textContent =
                chrome.i18n.getMessage('notGooglePage');
            return;
        }

        // extract current parameters
        const url = new URL(currentTab.url);
        const currentHl = url.searchParams.get('hl') || '';
        const currentGl = url.searchParams.get('gl') || '';
        const currentLr = url.searchParams.get('lr') || '';
        const currentCr = url.searchParams.get('cr') || '';

        // current setttings
        const defaultValue = chrome.i18n.getMessage('defaultValue');
        const displayHl = currentHl || defaultValue;
        const displayGl = currentGl || defaultValue;
        const displayLr = currentLr || defaultValue;
        const displayCr = currentCr || defaultValue;

        document.getElementById('currentSettings').textContent =
            chrome.i18n.getMessage('currentSettings', [displayHl, displayGl, displayLr, displayCr]);

        const hlSelect = document.getElementById('hlSelect');
        const glSelect = document.getElementById('glSelect');
        const lrSelect = document.getElementById('lrSelect');
        const crSelect = document.getElementById('crSelect');

        // Add unknown values to dropdowns if needed
        addUnknownValueOption(hlSelect, currentHl, LANGUAGES);
        addUnknownValueOption(glSelect, currentGl, COUNTRIES);
        addUnknownValueOption(lrSelect, currentLr, LR_LANGUAGES);
        addUnknownValueOption(crSelect, currentCr, CR_COUNTRIES);

        // Set current values in dropdowns
        hlSelect.value = currentHl;
        glSelect.value = currentGl;
        lrSelect.value = currentLr;
        crSelect.value = currentCr;

        updateStarButtons();
    });

    // Buttons

    document.getElementById('applyBtn').addEventListener('click', () => {
        const hl = document.getElementById('hlSelect').value;
        const gl = document.getElementById('glSelect').value;
        const lr = document.getElementById('lrSelect').value;
        const cr = document.getElementById('crSelect').value;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateParams',
                hl: hl,
                gl: gl,
                lr: lr,
                cr: cr
            }, (response) => {
                if (response && response.success) {
                    window.close();
                }
            });
        });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'resetParams'
            }, (response) => {
                if (response && response.success) {
                    window.close();
                }
            });
        });
    });

    // Preset section
    document.getElementById('presetSelect').addEventListener('change', (e) => {
        const presetId = e.target.value;
        if (presetId) {
            applyPreset(presetId);
        }
    });
    document.getElementById('savePresetBtn').addEventListener('click', () => {
        showPresetModal();
    });
    document.getElementById('deletePresetBtn').addEventListener('click', () => {
        showDeleteModal();
    });

    // Preset save modal
    document.getElementById('presetSaveBtn').addEventListener('click', () => {
        saveCurrentAsPreset();
    });
    document.getElementById('presetCancelBtn').addEventListener('click', () => {
        hidePresetModal();
    });
    document.getElementById('presetNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveCurrentAsPreset();
        } else if (e.key === 'Escape') {
            hidePresetModal();
        }
    });
    document.getElementById('presetModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('presetModal')) {
            hidePresetModal();
        }
    });

    // Preset delete modal
    document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
        deleteSelectedPreset();
    });
    document.getElementById('deleteCancelBtn').addEventListener('click', () => {
        hideDeleteModal();
    });
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('deleteModal')) {
            hideDeleteModal();
        }
    });
});
