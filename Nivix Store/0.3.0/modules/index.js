const meta = {
    sessionVersion: "0.2.0"
};

const store = {
    header: "[STORE] ",
    async init() {
        const h = store.header;
        console.log(`${h}Running Store Version: ${meta.sessionVersion}`);
        try { storetabs.load.setVersion(); } catch {}
        await files.init();
        try { await wait(prefs.default.loadTime); } catch {}
        storetabs.init.select_space.init();
        await tabs.change('workspace');
    }
};

store.init()