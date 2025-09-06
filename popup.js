// Initialize i18n and tab info
document.addEventListener('DOMContentLoaded', () => {
    // Replace all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = chrome.i18n.getMessage(key);
    });

    // 현재 탭 정보 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];

    // Google 검색 페이지인지 확인
    if (!currentTab.url.includes('google.co')) {
        document.getElementById('currentSettings').innerHTML = 
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

    document.getElementById('currentSettings').innerHTML = 
        chrome.i18n.getMessage('currentSettings', [displayHl, displayGl, displayLr, displayCr]);

    // 현재 탭의 설정을 셀렉트 박스에 반영
    document.getElementById('hlSelect').value = currentHl;
    document.getElementById('glSelect').value = currentGl;
    document.getElementById('lrSelect').value = currentLr;
    document.getElementById('crSelect').value = currentCr;
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
