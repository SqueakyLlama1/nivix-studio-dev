const assetLoader = {
    async load(type, path) {
        if (typeof(type) !== "string") throw new Error("Invalid type, type must be string");
        const sanType = type.trim().toLowerCase();

        if (sanType !== "css" && sanType !== "js") {
            console.error("[ASSET LOADER] Invalid type. Valid types are: 'css', 'js'");
            return;
        }

        function css(doc, href) {
            return new Promise((resolve, reject) => {
                const link = doc.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = href;
                link.onload = resolve;
                link.onerror = reject;
                doc.head.appendChild(link);
            });
        }

        function js(doc, src) {
            return new Promise((resolve, reject) => {
                const script = doc.createElement('script');
                link.src = src;
                link.onload = resolve;
                link.onerror = reject;
                doc.head.appendChild(link);
            });
        }

        const doc = document;
        if (type == "css") await css(doc, path);
        if (type == "js") await js(doc, path);
    }
};