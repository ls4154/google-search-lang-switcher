// 팝업에서 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateParams') {
        updateUrlParams(request.hl, request.gl, request.lr, request.cr);
        sendResponse({ success: true });
    } else if (request.action === 'resetParams') {
        resetUrlParams();
        sendResponse({ success: true });
    }
});

// URL 파라미터 업데이트 함수
function updateUrlParams(hl, gl, lr, cr) {
    const url = new URL(window.location.href);

    // hl 파라미터 처리
    if (hl) {
        url.searchParams.set('hl', hl);
    } else {
        url.searchParams.delete('hl');
    }

    // gl 파라미터 처리
    if (gl) {
        url.searchParams.set('gl', gl);
    } else {
        url.searchParams.delete('gl');
    }

    // lr 파라미터 처리
    if (lr) {
        url.searchParams.set('lr', lr);
    } else {
        url.searchParams.delete('lr');
    }

    // cr 파라미터 처리
    if (cr) {
        url.searchParams.set('cr', cr);
    } else {
        url.searchParams.delete('cr');
    }

    // 페이지 새로고침
    window.location.href = url.toString();
}

// URL 파라미터 초기화 함수
function resetUrlParams() {
    const url = new URL(window.location.href);
    
    // hl, gl, lr, cr 파라미터 제거
    url.searchParams.delete('hl');
    url.searchParams.delete('gl');
    url.searchParams.delete('lr');
    url.searchParams.delete('cr');
    
    // 페이지 새로고침
    window.location.href = url.toString();
}
