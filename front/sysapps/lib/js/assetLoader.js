const assetLoader = {
    async load(type, path, doc = document) {
        if (typeof(type) !== "string") throw new Error("Invalid type, type must be string");
        const sanType = type.trim().toLowerCase();

        if (sanType !== "css" && sanType !== "js") {
            console.error("[ASSET LOADER LIB] Invalid type. Valid types are: 'css', 'js'");
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
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                doc.head.appendChild(script);
            });
        }

        const target = doc;
        if (type == "css") await css(target, path);
        if (type == "js") await js(target, path);
    }
};