const studio_library = {
    load_theme_color() {
        let root = document.documentElement;
        root.style.setProperty('--col1', window.parent.prefs.loaded["th1"]);
        root.style.setProperty('--col2', window.parent.prefs.loaded["th2"]);
    }
};

studio_library.load_theme_color();