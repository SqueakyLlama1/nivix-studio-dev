const loadedStylesheets = new Map();

let stylesheetCounter = 0;

export function loadCSS(href, parent = document.head) {
    console.log(`Loading Stylesheet - Source: ${href}, Parent: ${parent}`);
    for (const [id, link] of loadedStylesheets.entries()) {
        if (link.getAttribute('href') === href) {
            return id;
        }
    }

    const link = document.createElement('link');
    link.rel = "stylesheet";
    link.href = href;

    const id = `stylesheet-${++stylesheetCounter}`;
    link.id = id;

    if (parent) {
        parent.appendChild(link);
    } else {
        console.error("Failed to append stylesheet. Parent doesn't exist.");
        return null;
    }

    loadedStylesheets.set(id, link);
    return id;
}

export function unloadCSS(id) {
    console.log(`Unloading Stylesheet with ID: ${id}`);
    if (loadedStylesheets.has(id)) {
        const link = loadedStylesheets.get(id);
        link.remove();
        loadedStylesheets.delete(id);
    } else {
        console.warn(`Stylesheet with ID "${id}" not found.`);
    }
}