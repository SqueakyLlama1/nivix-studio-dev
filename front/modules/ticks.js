// ======================
// Tick
// ======================

window.ticks = {
    timeTickInterval: null,

    start: {
        timeTick() {
            console.log("[Time Tick] Starting time tick...");
            ticks.timeTick();
            this.timeTickInterval = setInterval(ticks.timeTick, 1000);
        }
    },

    timeTick() {
        const now = new Date();
        const timeOutput = getEBD("timeDisplay");
        const dateOutput = getEBD("dateDisplay");
        if (!timeOutput || !dateOutput) return console.warn("[Time Tick] Missing time/date display elements");

        const hours = now.getHours() % 12 || 12;
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        timeOutput.textContent = `${hours}:${minutes} ${ampm}`;

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dateOutput.textContent = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }
};