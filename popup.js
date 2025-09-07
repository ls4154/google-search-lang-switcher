// Storage management
let userFavorites = {
    hl: [],
    gl: [],
    lr: [],
    cr: []
};

// Load user favorites from storage
async function loadFavorites() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['favorites'], (result) => {
            if (result.favorites) {
                userFavorites = result.favorites;
            } else {
                // Use default favorites for first-time users
                userFavorites = DEFAULT_FAVORITES;
            }
            resolve();
        });
    });
}

// Save user favorites to storage
function saveFavorites() {
    chrome.storage.sync.set({ favorites: userFavorites });
}

// Toggle favorite status
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

// Create option element with star button
function createOptionWithStar(value, text, type, isFavorite = false) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${isFavorite ? '⭐' : ''} ${text} - ${value}`;
    option.dataset.type = type;
    option.dataset.code = value;
    option.dataset.favorite = isFavorite;
    return option;
}

// Populate select elements with languages/countries
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
    hlSelect.innerHTML = `<option value="" data-i18n="defaultValue">${defaultText}</option>`;
    lrSelect.innerHTML = `<option value="" data-i18n="defaultValue">${defaultText}</option>`;

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
    glSelect.innerHTML = `<option value="" data-i18n="defaultValue">${defaultText}</option>`;
    crSelect.innerHTML = `<option value="" data-i18n="defaultValue">${defaultText}</option>`;

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

// Add star button handlers
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

// Update star button states
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
    // Load favorites first
    await loadFavorites();

    // Populate selects with favorites
    populateSelects();

    // Add star button handlers
    addStarButtonHandlers();

    // Add select change handlers
    addSelectChangeHandlers();

    // Replace all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (element.tagName === 'OPTION') {
            element.textContent = message;
        } else {
            element.textContent = message;
        }
    });

    // 현재 탭 정보 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    // Google 검색 페이지인지 확인
    if (!currentTab.url.includes('google.co')) {
        document.getElementById('currentSettings').textContent =
            chrome.i18n.getMessage('notGooglePage');
        return;
    }

    // 현재 URL에서 모든 파라미터 추출
    const url = new URL(currentTab.url);
    const currentHl = url.searchParams.get('hl') || '';
    const currentGl = url.searchParams.get('gl') || '';
    const currentLr = url.searchParams.get('lr') || '';
    const currentCr = url.searchParams.get('cr') || '';

    // 현재 설정 표시 (사용자 친화적으로)
    const defaultValue = chrome.i18n.getMessage('defaultValue');
    const displayHl = currentHl || defaultValue;
    const displayGl = currentGl || defaultValue;
    const displayLr = currentLr || defaultValue;
    const displayCr = currentCr || defaultValue;

    document.getElementById('currentSettings').textContent =
        chrome.i18n.getMessage('currentSettings', [displayHl, displayGl, displayLr, displayCr]);

    // 현재 탭의 설정을 셀렉트 박스에 반영
    document.getElementById('hlSelect').value = currentHl;
    document.getElementById('glSelect').value = currentGl;
    document.getElementById('lrSelect').value = currentLr;
    document.getElementById('crSelect').value = currentCr;

    // Update star button states
    updateStarButtons();
    });

    // 적용 버튼 클릭 이벤트
    document.getElementById('applyBtn').addEventListener('click', () => {
        const hl = document.getElementById('hlSelect').value;
        const gl = document.getElementById('glSelect').value;
        const lr = document.getElementById('lrSelect').value;
        const cr = document.getElementById('crSelect').value;

        // 현재 탭에 메시지 전송
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateParams',
                hl: hl,
                gl: gl,
                lr: lr,
                cr: cr
            }, (response) => {
                if (response && response.success) {
                    window.close(); // 팝업 닫기
                }
            });
        });
    });

    // 초기화 버튼 클릭 이벤트 (모든 파라미터 제거)
    document.getElementById('resetBtn').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'resetParams'
            }, (response) => {
                if (response && response.success) {
                    window.close(); // 팝업 닫기
                }
            });
        });
    });
});
