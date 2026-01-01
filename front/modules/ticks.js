// ======================
// Tick
// ======================

const ticks = {
    timeTickInterval: null,
    logSaveInterval: null,

    start: {
        timeTick() {
            studio.log.new("log", "[Time Tick] Starting time tick...");
            ticks.timeTick();
            this.timeTickInterval = setInterval(ticks.timeTick, 1000);
        },
        logSave() {
            // Save every 5 seconds (adjust as needed)
            if (ticks.logSaveInterval) clearInterval(ticks.logSaveInterval);
            ticks.logSaveInterval = setInterval(async () => {
                await studio.log.save();
            }, 5000);
        }
    },

    timeTick() {
        const now = new Date();
        const timeOutput = getEBD("timeDisplay");
        const dateOutput = getEBD("dateDisplay");
        if (!timeOutput || !dateOutput) return studio.log.new("warn", "[Time Tick] Missing time/date display elements");

        const hours = now.getHours() % 12 || 12;
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        timeOutput.textContent = `${hours}:${minutes} ${ampm}`;

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dateOutput.textContent = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }
};