chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateParams') {
        updateUrlParams(request.hl, request.gl, request.lr, request.cr);
        sendResponse({ success: true });
    } else if (request.action === 'resetParams') {
        resetUrlParams();
        sendResponse({ success: true });
    }
});

function updateUrlParams(hl, gl, lr, cr) {
    const url = new URL(window.location.href);

    if (hl) {
        url.searchParams.set('hl', hl);
    } else {
        url.searchParams.delete('hl');
    }

    if (gl) {
        url.searchParams.set('gl', gl);
    } else {
        url.searchParams.delete('gl');
    }

    if (lr) {
        url.searchParams.set('lr', lr);
    } else {
        url.searchParams.delete('lr');
    }

    if (cr) {
        url.searchParams.set('cr', cr);
    } else {
        url.searchParams.delete('cr');
    }

    // refresh
    window.location.href = url.toString();
}

function resetUrlParams() {
    const url = new URL(window.location.href);

    url.searchParams.delete('hl');
    url.searchParams.delete('gl');
    url.searchParams.delete('lr');
    url.searchParams.delete('cr');

    // refresh
    window.location.href = url.toString();
}
