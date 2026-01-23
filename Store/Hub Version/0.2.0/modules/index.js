const meta = {
    sessionVersion: "0.2.0"
};

const store = {
    header: "[STORE] ",
    async init() {
        const h = store.header;
        console.log(`${h}Running Store Version: ${meta.sessionVersion}`);
        await files.init();
        tabs.load.setVersion();
        await wait(prefs.default.loadTime);
        tabs.init.select_space.init();
        await tabs.change('workspace');
    }
};

document.addEventListener('DOMContentLoaded', store.init);