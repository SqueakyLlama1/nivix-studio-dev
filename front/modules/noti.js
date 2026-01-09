const notificationQueue = [];
let notificationActive = false;

async function showNextNotification() {
    if (notificationActive || notificationQueue.length === 0) return;
    notificationActive = true;

    const message = notificationQueue.shift();

    const notiElement = getEBD('notiContainer');
    const notiMessage = getEBD('notiMessage');
    if (!notiElement || !notiMessage) return console.warn("[Notification] Missing elements");

    notiMessage.textContent = message;
    notiElement.style.top = "1em";

    await wait(2000);
    notiElement.style.top = "-5em";
    await wait(300);

    notificationActive = false;
    showNextNotification();
}

function noti(message) {
    notificationQueue.push(message);
    showNextNotification();
}