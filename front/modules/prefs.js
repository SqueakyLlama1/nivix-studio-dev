const prefsPopupContainer = getEBD('prefsContainer');

const prefsBtn = getEBD('prefsButton');
const prefsNotiBtn = getEBD('prefsNoti');
const prefsPersonBtn = getEBD('prefsPerson');
const prefsAboutBtn = getEBD('prefsAbout');
const prefsCls = getEBD('prefsCls');
const prefsReset = getEBD('prefsReset');

window.prefs = {
    defaults: {
        appUpdNoti: true,
        stdoUpdNoti: true,
        taskEndNoti: true,
        appInstNoti: true,
        appUnstNoti: true,
        th1: "#43a4eb",
        th2: "#0079cf",
        tc: "#ffffff",
        loadTime: 100
    },

    loaded: {},
    prefsContainerJQ: $(prefsPopupContainer),

    open() {
        this.prefsContainerJQ.fadeIn(75);
        this.tab.open('prefsTabNoti');
    },

    close() {
        this.tab.clearSelected();
        this.prefsContainerJQ.fadeOut(75);
    },

    tab: {
        prefsTabs: document.querySelectorAll('.prefsTab'),
        prefsBtns: document.querySelectorAll('.prefsBtn'),

        async open(id) {
            await this.clear();
            this.clearSelected();
            const idEl = getEBD(id);
            if (!idEl) return;
            $(idEl).fadeIn(75);
            const buttonId = id.replace('Tab', '');
            const buttonEl = getEBD(buttonId);
            if (buttonEl) buttonEl.classList.add('selected');
        },

        async clear() {
            const fadeOuts = Array.from(this.prefsTabs).map(tab => {
                return new Promise(resolve => {
                    $(tab).fadeOut(75, () => resolve());
                });
            });
            await Promise.all(fadeOuts);
        },

        clearSelected() {
            this.prefsBtns.forEach(btn => btn.classList.remove('selected'));
        }
    },

    async set(pref, value) {
        this.loaded[pref] = value;
        await this.save();
        await this.apply();
    },

    async save() {
        await window.ndutil.writeJSON('prefs.json', this.loaded);
    },

    async apply() {
        // Theme colors
        let root = document.documentElement;
        root.style.setProperty('--col1', this.loaded.th1);
        root.style.setProperty('--col2', this.loaded.th2);
        root.style.setProperty('--tc', this.loaded.tc);
    },

    async load() {
        const saved = await window.ndutil.readJSON('prefs.json');
        this.loaded = saved || {};

        let changed = false;
        for (let k in this.defaults) {
            if (!(k in this.loaded)) {
                this.loaded[k] = this.defaults[k];
                changed = true;
            }
        }
        if (changed) await this.save();
    },

    async pop() {
        const inputs = {
            "appUpdNoti": getEBD('prefNotiAppUpd'),
            "stdoUpdNoti": getEBD('prefNotiStdoUpd'),
            "taskEndNoti": getEBD('prefNotiTskEnd'),
            "appPrldNoti": getEBD('prefNotiAppPrld'),
            "appInstNoti": getEBD('prefNotiAppInst'),
            "appUnstNoti": getEBD('prefNotiAppUnst'),
            "th1": getEBD('prefCol1'),
            "th2": getEBD('prefCol2'),
            "tc": getEBD('prefTxtCol'),
            "loadTime": getEBD('prefLoadTime')
        };

        for (let key in inputs) {
            const input = inputs[key];
            if (!input) continue;

            if (input.type === 'checkbox') {
                input.checked = this.loaded[key] ?? this.defaults[key];
            } else {
                input.value = this.loaded[key] ?? this.defaults[key];
            }

            input.addEventListener('change', async () => {
                if (input.type === 'checkbox') {
                    await this.set(key, input.checked);
                } else {
                    await this.set(key, input.value);
                }
            });
        }
    },

    async reset() {
        await window.ndutil.deleteFile('prefs.json');
        await this.stg.init();
        await this.pop();
        await this.apply();
        noti("Reset preferences");
    },

    stg: {
        async exists() {
            return (await window.ndutil.fileExists('prefs.json'));
        },

        async init() {
            prefs.loaded = { ...prefs.defaults };
            await prefs.save();
        }
    },

    async init() {
        if (!(await this.stg.exists())) {
            await this.stg.init();
        } else {
            await this.load();
        }

        await this.pop();
        await this.apply();

        [
            { btn: prefsNotiBtn, tab: 'prefsTabNoti' },
            { btn: prefsPersonBtn, tab: 'prefsTabPerson' },
            { btn: prefsAboutBtn, tab: 'prefsTabAbout' }
        ].forEach(({ btn, tab }) => btn.addEventListener('click', () => prefs.tab.open(tab)));

        prefsBtn.addEventListener('click', () => this.open());
        prefsCls.addEventListener('click', () => this.close());
        prefsReset.addEventListener('click', () => this.reset());
    }
};