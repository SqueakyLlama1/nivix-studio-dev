// === QUEUE & STATE ===
const notificationQueue = [];
let notificationActive = false;

// Track active progress notifications by ID
const progressNotiMap = {};

// === UTILITY ===
function hideAllNotifications() {
    const defaultEl = getEBD('noti-default');
    const progressEl = getEBD('noti-progress');
    const collapsedEl = getEBD('noti-progress-collapsed');

    if (defaultEl) defaultEl.style.display = 'none';
    if (progressEl) progressEl.style.display = 'none';
    if (collapsedEl) collapsedEl.style.display = 'none';
}

// === DEFAULT NOTIFICATIONS ===
async function showNextNotification() {
    if (notificationActive || notificationQueue.length === 0) return;
    notificationActive = true;

    const { message, type } = notificationQueue.shift();

    const container = getEBD('noti-container');
    const notiDefault = getEBD('noti-default');
    const messageEl = getEBD('noti-default-message');
    if (!container || !notiDefault || !messageEl) {
        console.warn('[Notification] Missing elements');
        notificationActive = false;
        return;
    }

    hideAllNotifications();

    // Reset icons
    getEBD('noti-default-icon-error').style.visibility = 'hidden';
    getEBD('noti-default-icon-warning').style.visibility = 'hidden';
    getEBD('noti-default-icon-info').style.visibility = 'hidden';

    // Show correct icon
    if (type === 'error') getEBD('noti-default-icon-error').style.visibility = 'visible';
    else if (type === 'warning') getEBD('noti-default-icon-warning').style.visibility = 'visible';
    else getEBD('noti-default-icon-info').style.visibility = 'visible';

    messageEl.textContent = message;

    notiDefault.style.display = 'flex';
    container.style.bottom = '4px';

    // Auto-hide after 2s
    await wait(2000);
    container.style.bottom = '-5em';
    await wait(300);

    notiDefault.style.display = 'none';
    container.style.bottom = '4px';

    notificationActive = false;
    showNextNotification();
}

// Public API for default notifications
function noti(message, type = 'info') {
    notificationQueue.push({ message, type });
    showNextNotification();
}

// === PROGRESS NOTIFICATIONS ===
function notiProgressStart(id, message = 'Working...', percent = 0, initialPercent = 0) {
    const container = getEBD('noti-container');
    const progress = getEBD('noti-progress');
    const progressMessage = getEBD('noti-progress-message');
    const progressPercentile = getEBD('noti-progress-percentile');
    const progressBar = getEBD('noti-progress-bar');
    const collapsed = getEBD('noti-progress-collapsed');
    const collapsedBar = getEBD('noti-progress-collapsed-bar');

    if (!container || !progress || !progressMessage || !progressPercentile || !progressBar || !collapsed || !collapsedBar) {
        console.warn('[Notification] Progress elements missing');
        return;
    }

    // Save state
    progressNotiMap[id] = { percent: initialPercent, message };

    // Initialize UI
    progressMessage.textContent = message;
    progressPercentile.textContent = `${initialPercent}%`;
    progressBar.style.width = `${initialPercent}%`;
    collapsedBar.style.width = `${initialPercent}%`;

    hideAllNotifications();
    progress.style.display = 'flex';
    collapsed.style.display = 'none';
    container.style.bottom = '4px';

    // Click toggle between expanded/collapsed
    const toggle = () => {
        if (progress.style.display === 'flex') {
            progress.style.display = 'none';
            collapsed.style.display = 'flex';
        } else {
            progress.style.display = 'flex';
            collapsed.style.display = 'none';
        }
    };
    progress.onclick = toggle;
    collapsed.onclick = toggle;

    // Auto-cleanup after 75ms if still lingering
    setTimeout(() => {
        if (progressNotiMap[id]) notiProgressEnd(id);
    }, 75);
}

function notiProgressUpdate(id, percent, message) {
    const progressMessage = getEBD('noti-progress-message');
    const progressPercentile = getEBD('noti-progress-percentile');
    const progressBar = getEBD('noti-progress-bar');
    const collapsedBar = getEBD('noti-progress-collapsed-bar');

    if (!progressNotiMap[id]) return console.warn(`[Notification] No progress notification for id "${id}"`);

    percent = Math.max(0, Math.min(100, percent));
    progressNotiMap[id].percent = percent;
    if (message !== undefined) progressNotiMap[id].message = message;

    progressMessage.textContent = progressNotiMap[id].message;
    progressPercentile.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    collapsedBar.style.width = `${percent}%`;
}

function notiProgressCollapse(id) {
    const progress = getEBD('noti-progress');
    const collapsed = getEBD('noti-progress-collapsed');
    if (!progressNotiMap[id]) return;

    progress.style.display = 'none';
    collapsed.style.display = 'flex';
}

function notiProgressExpand(id) {
    const progress = getEBD('noti-progress');
    const collapsed = getEBD('noti-progress-collapsed');
    if (!progressNotiMap[id]) return;

    progress.style.display = 'flex';
    collapsed.style.display = 'none';
}

function notiProgressEnd(id) {
    const container = getEBD('noti-container');
    const progress = getEBD('noti-progress');
    const collapsed = getEBD('noti-progress-collapsed');

    if (!progressNotiMap[id]) return;

    delete progressNotiMap[id];
    progress.style.display = 'none';
    collapsed.style.display = 'none';
    container.style.bottom = '4px';
}