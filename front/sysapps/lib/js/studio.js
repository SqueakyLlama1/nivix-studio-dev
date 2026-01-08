const studio_library = {
    load_theme_color() {
        let root = document.documentElement;
        root.style.setProperty('--accent', window.parent.prefs.loaded["th1"]);
        root.style.setProperty('--accent-dark', window.parent.prefs.loaded["th2"]);
    }
};

studio_library.load_theme_color();