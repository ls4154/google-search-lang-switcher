let userFavorites = {
    hl: [],
    gl: [],
    lr: [],
    cr: []
};

let userPresets = {};

// Multi-select instances
let lrMultiSelect = null;
let crMultiSelect = null;

let cachedUiRefs = null;

const STORAGE_KEYS = {
    favorites: 'favorites',
    presets: 'presets'
};

function loadFromSyncStorage(key, defaultValue) {
    return new Promise((resolve) => {
        chrome.storage.sync.get([key], (result) => {
            const value = result[key];
            if (value !== undefined && value !== null) {
                resolve(value);
                return;
            }

            if (defaultValue !== undefined) {
                chrome.storage.sync.set({ [key]: defaultValue }, () => resolve(defaultValue));
            } else {
                resolve(undefined);
            }
        });
    });
}

function saveToSyncStorage(key, value) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [key]: value }, resolve);
    });
}

function getUiRefs() {
    if (cachedUiRefs) {
        return cachedUiRefs;
    }

    const refs = {
        hlSelect: document.getElementById('hlSelect'),
        glSelect: document.getElementById('glSelect'),
        lrSelect: document.getElementById('lrSelect'),
        crSelect: document.getElementById('crSelect'),
        lrMultiSelect: document.getElementById('lrMultiSelect'),
        crMultiSelect: document.getElementById('crMultiSelect'),
        advancedToggle: document.getElementById('advancedToggle'),
        lrExclude: document.getElementById('lrExclude'),
        crExclude: document.getElementById('crExclude')
    };

    if (Object.values(refs).some(ref => !ref)) {
        throw new Error('Failed to initialize popup UI references');
    }

    cachedUiRefs = refs;
    return cachedUiRefs;
}

async function loadFavorites() {
    userFavorites = await loadFromSyncStorage(STORAGE_KEYS.favorites, DEFAULT_FAVORITES);
}

function saveFavorites() {
    saveToSyncStorage(STORAGE_KEYS.favorites, userFavorites);
}

async function loadPresets() {
    userPresets = await loadFromSyncStorage(STORAGE_KEYS.presets, DEFAULT_PRESETS);
}

function savePresets() {
    saveToSyncStorage(STORAGE_KEYS.presets, userPresets);
}

function deriveParamState(hl, gl, lr, cr) {
    const hlValue = hl || '';
    const glValue = gl || '';
    const lrValue = lr || '';
    const crValue = cr || '';
    const lrParsed = parseGoogleParam(lrValue);
    const crParsed = parseGoogleParam(crValue);

    const needsAdvanced = (lrParsed.values.length > 1 || lrParsed.isExclude) ||
        (crParsed.values.length > 1 || crParsed.isExclude);

    return {
        hlValue,
        glValue,
        lrValue,
        crValue,
        lrParsed,
        crParsed,
        needsAdvanced
    };
}

function renderParamState(paramState) {
    const {
        hlSelect,
        glSelect,
        lrSelect,
        crSelect,
        advancedToggle,
        lrExclude,
        crExclude
    } = getUiRefs();

    const {
        hlValue,
        glValue,
        lrValue,
        crValue,
        lrParsed,
        crParsed,
        needsAdvanced
    } = paramState;

    let isAdvanced = advancedToggle.checked;

    if (needsAdvanced && !isAdvanced) {
        advancedToggle.checked = true;
        toggleAdvancedMode('lr', true);
        toggleAdvancedMode('cr', true);
        isAdvanced = true;
    }

    addUnknownValueOption(hlSelect, hlValue, LANGUAGES);
    addUnknownValueOption(glSelect, glValue, COUNTRIES);
    hlSelect.value = hlValue;
    glSelect.value = glValue;

    if (isAdvanced) {
        lrMultiSelect.setValue(lrParsed.values);
        crMultiSelect.setValue(crParsed.values);
    } else {
        addUnknownValueOption(lrSelect, lrValue, LR_LANGUAGES);
        addUnknownValueOption(crSelect, crValue, CR_COUNTRIES);
        lrSelect.value = lrValue;
        crSelect.value = crValue;
    }

    lrExclude.checked = lrParsed.isExclude;
    crExclude.checked = crParsed.isExclude;

    updateStarButtons();
}

// Update UI elements with parameter values
function updateUIWithParams(hl, gl, lr, cr) {
    const paramState = deriveParamState(hl, gl, lr, cr);
    renderParamState(paramState);
}

// Get current selected parameter values
function getCurrentParams() {
    const {
        hlSelect,
        glSelect,
        lrSelect,
        crSelect,
        advancedToggle,
        lrExclude,
        crExclude
    } = getUiRefs();

    const hl = hlSelect.value;
    const gl = glSelect.value;

    let lr, cr;
    if (advancedToggle.checked) {
        const lrValues = lrMultiSelect.getValue();
        const crValues = crMultiSelect.getValue();

        const lrParsed = { values: lrValues, isExclude: lrExclude.checked };
        const crParsed = { values: crValues, isExclude: crExclude.checked };

        lr = encodeGoogleParam(lrParsed);
        cr = encodeGoogleParam(crParsed);
    } else {
        lr = lrSelect.value;
        cr = crSelect.value;
    }

    return { hl, gl, lr, cr };
}

// Apply preset to current settings
function applyPreset(presetId) {
    if (!userPresets[presetId]) return;

    const preset = userPresets[presetId];
    const params = preset.params;

    updateUIWithParams(params.hl, params.gl, params.lr, params.cr);
}

// Show custom modal for preset name input
function showPresetModal() {
    const { hl: hlValue, gl: glValue, lr: lrValue, cr: crValue } = getCurrentParams();

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

    const { hl: hlValue, gl: glValue, lr: lrValue, cr: crValue } = getCurrentParams();

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
    if (!value) return; // Skip if empty

    const parsed = parseGoogleParam(value);

    // If this is an exclude value, don't add it as custom option in regular select
    // It will be handled by Advanced mode
    if (parsed.isExclude) return;

    // For multi-value, check if any value is unknown
    if (parsed.values.length > 1) {
        // Multi-value will be handled by Advanced mode
        return;
    }

    // Check if single value is known
    if (parsed.values.length === 1 && knownValues[parsed.values[0]]) return;

    if (knownValues[value]) return; // Skip if original value is known

    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value} (custom)`;
    option.style.fontStyle = 'italic';
    option.style.color = '#f57c00';
    option.dataset.isCustom = 'true';

    // Add at the end to clearly separate from regular options
    selectElement.appendChild(option);
}

// Multi-select functionality
class MultiSelect {
    constructor(containerId, options, type) {
        this.container = document.getElementById(containerId);
        this.display = this.container.querySelector('.multi-select-display span');
        this.dropdown = this.container.querySelector('.multi-select-dropdown');
        this.options = options;
        this.type = type;
        this.selectedValues = new Set();

        this.init();
    }

    init() {
        // Add search input to dropdown
        this.createSearchInput();

        // Populate dropdown options
        this.populateDropdown();

        // Add event listeners
        this.container.querySelector('.multi-select-display').addEventListener('click', () => {
            this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    createSearchInput() {
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'multi-select-search';
        this.searchInput.placeholder = 'Type to search...';
        this.searchInput.style.cssText = `
            width: calc(100% - 16px);
            margin: 4px 8px;
            padding: 6px 8px;
            border: 1px solid #dadce0;
            border-radius: 3px;
            font-size: 12px;
            outline: none;
        `;

        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });

        // Prevent dropdown from closing when clicking on search input
        this.searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    populateDropdown(searchTerm = '') {
        // Clear dropdown but keep search input
        while (this.dropdown.children.length > 1) {
            this.dropdown.removeChild(this.dropdown.lastChild);
        }

        // Add search input if not already present
        if (!this.dropdown.querySelector('.multi-select-search')) {
            this.dropdown.appendChild(this.searchInput);
        }

        const favorites = userFavorites[this.type] || [];
        const filteredFavorites = favorites.filter(value =>
            this.options[value] && this.matchesSearch(value, this.options[value], searchTerm)
        );

        // Add favorites first if any match search
        if (filteredFavorites.length > 0) {
            filteredFavorites.forEach(value => {
                this.addOption(value, this.options[value], true);
            });

            // Add separator
            const separator = document.createElement('div');
            separator.style.borderBottom = '1px solid #dadce0';
            separator.style.margin = '4px 0';
            this.dropdown.appendChild(separator);
        }

        // Add all other options that match search
        Object.entries(this.options).forEach(([value, name]) => {
            if (!favorites.includes(value) && this.matchesSearch(value, name, searchTerm)) {
                this.addOption(value, name, false);
            }
        });
    }

    matchesSearch(value, name, searchTerm) {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return name.toLowerCase().includes(search) || value.toLowerCase().includes(search);
    }

    filterOptions(searchTerm) {
        this.populateDropdown(searchTerm);
    }

    addOption(value, name, isFavorite) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multi-select-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.checked = this.selectedValues.has(value);

        const label = document.createElement('span');
        const displayText = `${name} - ${value}`;
        label.textContent = isFavorite ? `⭐ ${displayText}` : displayText;

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);

        // Handle checkbox change
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                this.selectedValues.add(value);
            } else {
                this.selectedValues.delete(value);
            }
            this.updateDisplay();
            this.updateHiddenSelect();
            updateStarButtons();
        });

        this.dropdown.appendChild(optionDiv);
    }

    updateDisplay() {
        const count = this.selectedValues.size;
        const defaultText = chrome.i18n.getMessage('defaultValue') || 'Default';

        if (count === 0) {
            this.display.textContent = defaultText;
        } else if (count === 1) {
            const value = [...this.selectedValues][0];
            const name = this.options[value] || value;
            this.display.textContent = name;
        } else {
            const names = [...this.selectedValues].map(value => this.options[value] || value);
            this.display.textContent = names.join(', ');
        }
    }

    updateHiddenSelect() {
        const hiddenSelect = document.getElementById(this.type + 'Select');
        const joinedValue = [...this.selectedValues].join('|');
        hiddenSelect.value = joinedValue;
    }

    setValue(values) {
        this.selectedValues.clear();
        if (Array.isArray(values)) {
            values.forEach(v => this.selectedValues.add(v));
        } else if (values) {
            // Single value as string
            this.selectedValues.add(values);
        }
        this.updateDisplay();
        this.updateCheckboxes();
        this.updateHiddenSelect();
    }

    updateCheckboxes() {
        const checkboxes = this.dropdown.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.selectedValues.has(checkbox.value);
        });
    }

    toggleDropdown() {
        const isVisible = this.dropdown.style.display === 'block';
        if (isVisible) {
            this.closeDropdown();
        } else {
            this.dropdown.style.display = 'block';

            // Calculate position and adjust dropdown direction
            this.adjustDropdownPosition();

            // Focus on search input and clear any existing search
            setTimeout(() => {
                this.searchInput.value = '';
                this.searchInput.focus();
                this.populateDropdown('');
            }, 0);
        }
    }

    adjustDropdownPosition() {
        const containerRect = this.container.getBoundingClientRect();
        const dropdownHeight = 200; // Estimated dropdown height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - containerRect.bottom;
        const spaceAbove = containerRect.top;

        // Reset any previous positioning
        this.dropdown.style.top = '';
        this.dropdown.style.bottom = '';

        // If not enough space below but more space above, open upward
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            this.dropdown.style.bottom = '100%';
            this.dropdown.style.top = 'auto';
        } else {
            // Default: open downward
            this.dropdown.style.top = '100%';
            this.dropdown.style.bottom = 'auto';
        }
    }

    closeDropdown() {
        this.dropdown.style.display = 'none';
    }

    getValue() {
        return [...this.selectedValues];
    }
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
    const { hlSelect, glSelect, lrSelect, crSelect } = getUiRefs();
    // Save current selections
    const currentHl = hlSelect.value;
    const currentGl = glSelect.value;
    const currentLr = lrSelect.value;
    const currentCr = crSelect.value;

    populateLanguageSelects();
    populateCountrySelects();

    // Restore current selections
    hlSelect.value = currentHl;
    glSelect.value = currentGl;
    lrSelect.value = currentLr;
    crSelect.value = currentCr;
}

function populateLanguageSelects() {
    const { hlSelect, lrSelect } = getUiRefs();

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
    const { glSelect, crSelect } = getUiRefs();

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
    const ui = getUiRefs();

    // HL star button
    const hlStar = document.getElementById('hlStar');
    hlStar.addEventListener('click', () => {
        const hlSelectedOption = ui.hlSelect.options[ui.hlSelect.selectedIndex];
        if (hlSelectedOption && hlSelectedOption.value) {
            const hlCode = hlSelectedOption.value;
            if (LANGUAGES[hlCode]) {
                toggleFavorite('hl', hlCode);
                updateStarButtons();
            }
        }
    });

    // LR star button
    const lrStar = document.getElementById('lrStar');
    lrStar.addEventListener('click', () => {
        const lrHandlerIsAdvanced = ui.advancedToggle.checked;

        if (lrHandlerIsAdvanced) {
            // Advanced mode - use multi-select
            if (lrMultiSelect && lrMultiSelect.selectedValues.size === 1) {
                const selectedValue = [...lrMultiSelect.selectedValues][0];
                if (LR_LANGUAGES[selectedValue]) {
                    toggleFavorite('lr', selectedValue);
                    updateStarButtons();
                }
            }
        } else {
            // Regular mode - use regular select
            const lrSelectedOption = ui.lrSelect.options[ui.lrSelect.selectedIndex];
            if (lrSelectedOption && lrSelectedOption.value) {
                const lrHandlerCode = lrSelectedOption.value;
                if (LR_LANGUAGES[lrHandlerCode]) {
                    toggleFavorite('lr', lrHandlerCode);
                    updateStarButtons();
                }
            }
        }
    });

    // GL star button
    const glStar = document.getElementById('glStar');
    glStar.addEventListener('click', () => {
        const glSelectedOption = ui.glSelect.options[ui.glSelect.selectedIndex];
        if (glSelectedOption && glSelectedOption.value) {
            const glCode = glSelectedOption.value;
            if (COUNTRIES[glCode]) {
                toggleFavorite('gl', glCode);
                updateStarButtons();
            }
        }
    });

    // CR star button
    const crStar = document.getElementById('crStar');
    crStar.addEventListener('click', () => {
        const crHandlerIsAdvanced = ui.advancedToggle.checked;

        if (crHandlerIsAdvanced) {
            // Advanced mode - use multi-select
            if (crMultiSelect && crMultiSelect.selectedValues.size === 1) {
                const selectedValue = [...crMultiSelect.selectedValues][0];
                if (CR_COUNTRIES[selectedValue]) {
                    toggleFavorite('cr', selectedValue);
                    updateStarButtons();
                }
            }
        } else {
            // Regular mode - use regular select
            const crSelectedOption = ui.crSelect.options[ui.crSelect.selectedIndex];
            if (crSelectedOption && crSelectedOption.value) {
                const crHandlerCode = crSelectedOption.value;
                if (CR_COUNTRIES[crHandlerCode]) {
                    toggleFavorite('cr', crHandlerCode);
                    updateStarButtons();
                }
            }
        }
    });
}

function updateStarButtons() {
    const ui = getUiRefs();

    // HL star
    const hlStar = document.getElementById('hlStar');
    const hlSelectedOption = ui.hlSelect.options[ui.hlSelect.selectedIndex];
    const hlCode = hlSelectedOption?.value;
    if (hlCode && LANGUAGES[hlCode] && userFavorites.hl.includes(hlCode)) {
        hlStar.classList.remove('inactive');
        hlStar.title = 'Remove from favorites';
    } else {
        hlStar.classList.add('inactive');
        hlStar.title = 'Add to favorites';
    }

    // LR star (check both regular and multi-select modes)
    const lrStar = document.getElementById('lrStar');
    const lrIsAdvanced = ui.advancedToggle.checked;

    if (lrIsAdvanced) {
        // Advanced mode
        if (lrMultiSelect && lrMultiSelect.selectedValues.size > 1) {
            // Multiple selections - disable star
            lrStar.classList.add('inactive');
            lrStar.title = 'Use presets for multiple selections';
            lrStar.style.opacity = '0.5';
            lrStar.style.cursor = 'not-allowed';
        } else if (lrMultiSelect && lrMultiSelect.selectedValues.size === 1) {
            // Single selection - check if favorite
            const selectedValue = [...lrMultiSelect.selectedValues][0];
            if (userFavorites.lr.includes(selectedValue)) {
                lrStar.classList.remove('inactive');
                lrStar.title = 'Remove from favorites';
            } else {
                lrStar.classList.add('inactive');
                lrStar.title = 'Add to favorites';
            }
            lrStar.style.opacity = '1';
            lrStar.style.cursor = 'pointer';
        } else {
            // No selection
            lrStar.classList.add('inactive');
            lrStar.title = 'Add to favorites';
            lrStar.style.opacity = '1';
            lrStar.style.cursor = 'pointer';
        }
    } else {
        // Regular mode
        const lrSelectedOption = ui.lrSelect.options[ui.lrSelect.selectedIndex];
        const lrCode = lrSelectedOption?.value;
        if (lrCode && LR_LANGUAGES[lrCode] && userFavorites.lr.includes(lrCode)) {
            lrStar.classList.remove('inactive');
            lrStar.title = 'Remove from favorites';
        } else {
            lrStar.classList.add('inactive');
            lrStar.title = 'Add to favorites';
        }
        lrStar.style.opacity = '1';
        lrStar.style.cursor = 'pointer';
    }

    // GL star
    const glStar = document.getElementById('glStar');
    const glSelectedOption = ui.glSelect.options[ui.glSelect.selectedIndex];
    const glCode = glSelectedOption?.value;
    if (glCode && COUNTRIES[glCode] && userFavorites.gl.includes(glCode)) {
        glStar.classList.remove('inactive');
        glStar.title = 'Remove from favorites';
    } else {
        glStar.classList.add('inactive');
        glStar.title = 'Add to favorites';
    }

    // CR star (check both regular and multi-select modes)
    const crStar = document.getElementById('crStar');
    const crIsAdvanced = ui.advancedToggle.checked;

    if (crIsAdvanced) {
        // Advanced mode
        if (crMultiSelect && crMultiSelect.selectedValues.size > 1) {
            // Multiple selections - disable star
            crStar.classList.add('inactive');
            crStar.title = 'Use presets for multiple selections';
            crStar.style.opacity = '0.5';
            crStar.style.cursor = 'not-allowed';
        } else if (crMultiSelect && crMultiSelect.selectedValues.size === 1) {
            // Single selection - check if favorite
            const selectedValue = [...crMultiSelect.selectedValues][0];
            if (userFavorites.cr.includes(selectedValue)) {
                crStar.classList.remove('inactive');
                crStar.title = 'Remove from favorites';
            } else {
                crStar.classList.add('inactive');
                crStar.title = 'Add to favorites';
            }
            crStar.style.opacity = '1';
            crStar.style.cursor = 'pointer';
        } else {
            // No selection
            crStar.classList.add('inactive');
            crStar.title = 'Add to favorites';
            crStar.style.opacity = '1';
            crStar.style.cursor = 'pointer';
        }
    } else {
        // Regular mode
        const crSelectedOption = ui.crSelect.options[ui.crSelect.selectedIndex];
        const crCode = crSelectedOption?.value;
        if (crCode && CR_COUNTRIES[crCode] && userFavorites.cr.includes(crCode)) {
            crStar.classList.remove('inactive');
            crStar.title = 'Remove from favorites';
        } else {
            crStar.classList.add('inactive');
            crStar.title = 'Add to favorites';
        }
        crStar.style.opacity = '1';
        crStar.style.cursor = 'pointer';
    }
}

// Add change listeners to update star buttons
function addSelectChangeHandlers() {
    const { hlSelect, glSelect, lrSelect, crSelect } = getUiRefs();
    [hlSelect, glSelect, lrSelect, crSelect].forEach(select => {
        select.addEventListener('change', updateStarButtons);
    });
}

function addAdvancedToggleHandler() {
    const { advancedToggle } = getUiRefs();

    advancedToggle.addEventListener('change', () => {
        const isAdvanced = advancedToggle.checked;
        toggleAdvancedMode('lr', isAdvanced);
        toggleAdvancedMode('cr', isAdvanced);
    });
}

function toggleAdvancedMode(type, isAdvanced) {
    const ui = getUiRefs();
    const isLanguageRestrict = type === 'lr';
    const regularSelect = isLanguageRestrict ? ui.lrSelect : ui.crSelect;
    const multiSelect = isLanguageRestrict ? ui.lrMultiSelect : ui.crMultiSelect;
    const multiSelectInstance = isLanguageRestrict ? lrMultiSelect : crMultiSelect;
    const excludeToggle = isLanguageRestrict ? ui.lrExclude : ui.crExclude;
    const excludeContainer = excludeToggle.parentElement;

    if (isAdvanced) {
        // Switch to multi-select mode
        regularSelect.style.display = 'none';
        multiSelect.style.display = 'block';

        // Show and enable exclude toggle
        excludeToggle.disabled = false;
        excludeContainer.style.display = 'flex';

        // Transfer current value to multi-select
        const currentValue = regularSelect.value;
        if (currentValue) {
            // currentValue is a string, convert to single-item array
            multiSelectInstance.setValue(currentValue ? [currentValue] : []);
        }
    } else {
        // Switch to single select mode
        multiSelect.style.display = 'none';
        regularSelect.style.display = 'block';

        // Hide and disable exclude toggle
        excludeToggle.disabled = true;
        excludeToggle.checked = false;
        excludeContainer.style.display = 'none';

        // Transfer first selected value back to regular select
        const selectedValues = multiSelectInstance.selectedValues;
        if (selectedValues.size > 0) {
            const firstValue = [...selectedValues][0];
            regularSelect.value = firstValue;
        } else {
            regularSelect.value = '';
        }

        // Clear multi-select
        multiSelectInstance.setValue([]);
    }

    updateStarButtons();
}

// Parse Google search parameter into structured format
function parseGoogleParam(value) {
    if (!value) {
        return { values: [], isExclude: false };
    }

    let isExclude = false;
    let cleanValue = value;

    if (value.startsWith('-')) {
        isExclude = true;
        cleanValue = value.slice(1);
    }

    if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
        cleanValue = cleanValue.slice(1, -1);
    }

    const values = cleanValue ? cleanValue.split('|') : [];

    return { values, isExclude };
}

// Encode structured format back to Google search parameter
function encodeGoogleParam(parsedObj) {
    if (!parsedObj || parsedObj.values.length === 0) {
        return '';
    }

    const { values, isExclude } = parsedObj;
    const joinedValues = values.join('|');

    if (!isExclude) {
        return joinedValues;
    }

    if (values.length === 1) {
        return `-${joinedValues}`;
    } else {
        return `-(${joinedValues})`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load favorites and presets
    await loadFavorites();
    await loadPresets();
    populateSelects();
    populatePresets();

    // Init multi-select dropdowns
    lrMultiSelect = new MultiSelect('lrMultiSelect', LR_LANGUAGES, 'lr');
    crMultiSelect = new MultiSelect('crMultiSelect', CR_COUNTRIES, 'cr');

    // Add event handlers
    addStarButtonHandlers();
    addSelectChangeHandlers();
    addAdvancedToggleHandler();

    // i18n elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        element.textContent = message;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        const message = chrome.i18n.getMessage(key);
        element.title = message;
    });

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];

        // Check if it's a Google page
        if (!currentTab.url || !currentTab.url.includes('google.com')) {
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

        updateUIWithParams(currentHl, currentGl, currentLr, currentCr);
    });

    // Buttons

    document.getElementById('applyBtn').addEventListener('click', () => {
        const { hl, gl, lr, cr } = getCurrentParams();

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
