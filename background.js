// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
    if (command === 'cycle-preset') {
        cyclePreset();
    }
});

async function cyclePreset() {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!currentTab.url || !(currentTab.url.includes('google.com'))) {
        return;
    }

    const { presets } = await chrome.storage.sync.get(['presets']);
    const userPresets = presets || {};

    const url = new URL(currentTab.url);
    const currentHl = url.searchParams.get('hl') || '';
    const currentGl = url.searchParams.get('gl') || '';
    const currentLr = url.searchParams.get('lr') || '';
    const currentCr = url.searchParams.get('cr') || '';

    const presetList = [
        { id: '__default__', params: { hl: '', gl: '', lr: '', cr: '' } },
        ...Object.entries(userPresets).map(([id, preset]) => ({
            id,
            params: preset.params
        }))
    ];

    let currentIndex = presetList.findIndex(preset =>
        preset.params.hl === currentHl &&
        preset.params.gl === currentGl &&
        preset.params.lr === currentLr &&
        preset.params.cr === currentCr
    );

    // cycle back to 0 if at end
    const nextIndex = (currentIndex + 1) % presetList.length;
    const nextPreset = presetList[nextIndex];

    chrome.tabs.sendMessage(currentTab.id, {
        action: 'updateParams',
        hl: nextPreset.params.hl,
        gl: nextPreset.params.gl,
        lr: nextPreset.params.lr,
        cr: nextPreset.params.cr
    });
}
