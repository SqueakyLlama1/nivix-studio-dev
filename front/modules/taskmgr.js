window.processes = {};
window.processAppMeta = {};
let topZIndex = 2000;

function bringToFront(id) {
    if (!processes[id]) return;
    topZIndex++;
    const el = getEBD(`task-${id}`);
    if (el) el.style.zIndex = topZIndex;
}

async function newTask(id) {
    if (processes[id]) return resTask(id);
    
    document.body.style.cursor = "progress";
    
    const sysIndexPath = [id, 'index.html'];
    const userIndexPath = ['apps', id, 'index.html'];
    
    let sysExists = false, userExists = false;
    try {
        sysExists = await window.ndutil.fileExists(sysIndexPath, 'sysapps');
        userExists = await window.ndutil.fileExists(userIndexPath);
    } catch (err) {
        console.error('Error checking file existence:', err);
    }
    
    if (!sysExists && !userExists) {
        sendCriticalFailure(`Requested app "${id}" could not be found (index.html missing)`);
        return;
    }
    
    const isSys = sysExists;
    const basePath = isSys ? [id] : ['apps', id];
    
    let pkg = {};
    try {
        pkg = await window.ndutil.readJSON([...basePath, 'pkg.json'], isSys ? 'sysapps' : undefined);
        if (!pkg || !pkg.version) throw new Error('Missing version field');
        // fill optional defaults
        pkg.window = pkg.window || {};
        pkg.lib = pkg.lib || {};
        pkg.displayName = pkg.displayName || pretty(id);
        pkg.window.resizable = pkg.window.resizable ?? true;
        pkg.window["titlebar-blocks"] = pkg.window["titlebar-blocks"] || [];
        pkg.lib.css = pkg.lib.css || [];
        pkg.lib.js = pkg.lib.js || [];
    } catch (err) {
        sendCriticalFailure(`App package file not found or invalid for "${id}"`, err);
        return;
    }
    
    const dockHeight = 2.1 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const minAppHeight = 400 + dockHeight;
    const maxAppHeight = window.innerHeight - dockHeight;
    const titleBarHeight = 1.3 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    
    let width = pkg.window.width ? Math.min(Math.max(pkg.window.width, 400), window.innerWidth) : 400;
    let height = pkg.window.height ? Math.min(Math.max(pkg.window.height, minAppHeight), maxAppHeight) : minAppHeight;
    const resizable = pkg.window.resizable;
    const titlebarBlocks = pkg.window["titlebar-blocks"];
    const cssLibs = pkg.lib.css;
    const jsLibs = pkg.lib.js;
    const exePath = pkg.executable
    ? (isSys ? `sysapps/${id}/${pkg.executable}` : `dynamic/apps/${id}/${pkg.executable}`)
    : null;
    
    processAppMeta[id] = pkg;
    
    let taskEl;
    try {
        taskEl = $('<div>', { class: 'task', id: `task-${id}` }).css({ width: width + 'px', height: height + 'px' });
    } catch (err) {
        sendCriticalFailure(`Failed to create task element for "${id}"`, err);
        return;
    }
    
    let appImg = 'img/app.png';
    try {
        if (await window.ndutil.fileExists(isSys ? [id, `${id}.png`] : ['apps', id, `${id}.png`], isSys ? 'sysapps' : undefined)) {
            appImg = isSys ? `sysapps/${id}/${id}.png` : `dynamic/apps/${id}/${id}.png`;
        } else if (await window.ndutil.fileExists(isSys ? [id, 'favicon.png'] : ['apps', id, 'favicon.png'], isSys ? 'sysapps' : undefined)) {
            appImg = isSys ? `sysapps/${id}/favicon.png` : `dynamic/apps/${id}/favicon.png`;
        }
    } catch (err) {
        console.warn('Failed to find app image. Using default.', err);
    }
    
    if (resizable) taskEl.addClass('resizable');
    
    const barEl = $('<div>', { class: 'bar' });
    const labelEl = $('<span>').text(pkg.displayName);
    const imgEl = $('<img>', { src: appImg });
    
    const exitBtn = $('<button>').text('X').on('click', () => endTask(id));
    const fullscreenBtn = $('<button>')
    .text('❐')
    .prop('disabled', !resizable || titlebarBlocks.includes('fullscreen'))
    .on('click', () => toggleFullscreen(id));
    const minBtn = $('<button>').text('－').on('click', () => minTask(id));
    const refreshBtn = $('<button>').text('⭮').on('click', () => refTask(id));
    
    barEl.append(exitBtn, fullscreenBtn, minBtn, refreshBtn, imgEl, labelEl);
    taskEl.append(barEl);
    
    const iframeSrc = isSys ? `sysapps/${id}/index.html` : `dynamic/apps/${id}/index.html`;
    
    let iframeEl;
    try {
        iframeEl = $('<iframe>', { src: iframeSrc, id: `task-${id}-iframe` });
        taskEl.append(iframeEl);
        $('body').append(taskEl);
    } catch (err) {
        sendCriticalFailure(`Failed to append main iframe for "${id}"`, err);
        return;
    }
    
    processes[id] = { active: true };
    bringToFront(id);
    dock.icon.new(appImg, id);
    
    const dockEl = getEBD(`${id}-dock`);
    if (dockEl) dockEl.classList.add("active");
    
    taskEl.css({ opacity: 0, transform: 'scale(0.9)' }).show().animate(
        { opacity: 1 },
        {
            duration: 75,
            step(now) { $(this).css('transform', `scale(${0.9 + 0.1 * now})`); }
        }
    );
    
    const taskDiv = taskEl[0];
    const barDiv = barEl[0];
    const iframe = iframeEl[0];
    
    Object.assign(taskDiv.dataset, {
        prevLeft: taskDiv.style.left || '0px',
        prevTop: taskDiv.style.top || '0px',
        prevWidth: taskDiv.style.width || width + 'px',
        prevHeight: taskDiv.style.height || height + 'px',
        fullscreen: 'false'
    });
    
    let savedTransition = taskDiv.style.transition;
    
    taskDiv.addEventListener('mousedown', () => bringToFront(id));
    iframe.addEventListener('mousedown', () => bringToFront(id));
    
    // Dragging setup
    let offsetX = 0, offsetY = 0, isDragging = false, dragInterval = null;
    window.mouseX = 0;
    window.mouseY = 0;
    
    document.addEventListener('pointermove', e => {
        window.mouseX = e.clientX;
        window.mouseY = e.clientY;
    });
    
    const dragShield = document.createElement('div');
    Object.assign(dragShield.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        cursor: 'move', zIndex: '999999', pointerEvents: 'auto', background: 'transparent', display: 'none'
    });
    document.body.appendChild(dragShield);
    
    function startDrag(e) {
        try {
            const rect = taskDiv.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            isDragging = true;
            taskDiv.style.transition = 'none';
            
            if (taskDiv.dataset.fullscreen === 'true') return;
            
            bringToFront(id);
            dragShield.style.display = 'block';
            
            dragInterval = setInterval(() => {
                if (!isDragging) return;
                
                let newLeft = window.mouseX - offsetX;
                let newTop = window.mouseY - offsetY;
                
                newLeft = Math.min(Math.max(newLeft, -taskDiv.offsetWidth + 50), window.innerWidth - 50);
                newTop = Math.min(Math.max(newTop, 0), window.innerHeight - parseFloat(titleBarHeight) - parseFloat(dockHeight));
                
                taskDiv.style.left = `${newLeft}px`;
                taskDiv.style.top = `${newTop}px`;
            }, 16);
        } catch (err) { console.error('Drag error:', err); }
    }
    
    function stopDrag() {
        try {
            if (!isDragging) return;
            isDragging = false;
            taskDiv.style.transition = savedTransition || '';
            dragShield.style.display = 'none';
            clearInterval(dragInterval);
            dragInterval = null;
        } catch (err) { console.error('Stop drag error:', err); }
    }
    
    // Pointer down for drag initiation
    barDiv.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        
        function onMove(ev) {
            try {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (!moved && Math.sqrt(dx * dx + dy * dy) > 5) {
                    moved = true;
                    startDrag(e);
                }
            } catch (err) { console.error('Drag move error:', err); }
        }
        
        function onUp() {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            if (moved) stopDrag();
        }
        
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
    
    dragShield.addEventListener('pointerup', stopDrag);
    
    // Resizing logic
    taskDiv.addEventListener('mousedown', e => {
        try {
            if (!resizable) return;
            
            const rect = taskDiv.getBoundingClientRect();
            const margin = 10;
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Start resizing only if cursor near bottom-right corner
            if (x > rect.width - margin || y > rect.height - margin) {
                taskDiv.style.transition = 'none';
            }
        } catch (err) { console.error('Resize start error:', err); }
    });
    
    // Restore transition after mouseup
    document.addEventListener('mouseup', () => {
        try {
            if (taskDiv.style.transition === 'none') {
                taskDiv.style.transition =
                savedTransition || 'background 0.2s ease, transform 0.2s ease, width 0.2s ease, height 0.2s ease, top 0.2s ease, left 0.2s ease';
            }
        } catch (err) { console.error('Mouseup transition restore error:', err); }
    });
    
    iframe.addEventListener('load', async () => {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            
            for (const cssFile of cssLibs) {
                try {
                    if (await window.ndutil.fileExists(['lib', 'css', cssFile + '.css'], 'sysapps')) {
                        await assetLoader.load('css', `${studio.bind}/front/sysapps/lib/css/${cssFile}.css`, doc);
                    }
                } catch (err) { console.warn(`Failed to load CSS ${cssFile}`, err); }
            }
            
            for (const jsFile of jsLibs) {
                try {
                    if (await window.ndutil.fileExists(['lib', 'js', jsFile + '.js'], 'sysapps')) {
                        await assetLoader.load('js', `${studio.bind}/front/sysapps/lib/js/${jsFile}.js`, doc);
                    }
                } catch (err) { console.warn(`Failed to load JS ${jsFile}`, err); }
            }
            
            if (exePath) {
                try { await assetLoader.load('js', `/front/${exePath}`, doc); }
                catch (err) { console.warn(`Failed to load executable ${exePath}`, err); }
            }
        } catch (err) { console.error('Iframe load error:', err); }
    });
    
    document.body.style.cursor = "auto";
    
    function sendCriticalFailure(message, err) {
        console.error(`Critical failure in app "${id}": ${message}`, err);
        noti(`App "${id}" crashed: ${message}`);
        endTask(id);
    }
}

window.addEventListener('resize', () => {
    const dockHeight = 2.1 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const minHeight = 400 + dockHeight;
    const maxHeight = window.innerHeight - dockHeight;
    const titleBarHeight = 1.3 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    
    for (const id in processes) {
        const taskDiv = getEBD(`task-${id}`);
        if (!taskDiv) continue;
        
        const width = Math.min(parseInt(taskDiv.style.width) || 400, window.innerWidth);
        const height = Math.min(Math.max(parseInt(taskDiv.style.height) || minHeight, minHeight), maxHeight);
        
        taskDiv.style.left = '0px';
        taskDiv.style.top = '0px';
        taskDiv.style.width = width + 'px';
        taskDiv.style.height = height + 'px';
        
        taskDiv.dataset.prevLeft = '0px';
        taskDiv.dataset.prevTop = '0px';
        taskDiv.dataset.prevWidth = width + 'px';
        taskDiv.dataset.prevHeight = height + 'px';
    }
});

function minTask(id) {
    if (!processes[id]) return;
    processes[id].active = false;
    
    const dockEl = getEBD(`${id}-dock`);
    if (dockEl) dockEl.classList.remove("active");
    
    const el = $(`#task-${id}`);
    el.animate(
        { opacity: 0 },
        { duration: 75, complete: () => el.hide() }
    );
}

function resTask(id) {
    if (!processes[id]) return;
    processes[id].active = true;
    bringToFront(id);
    
    const dockEl = getEBD(`${id}-dock`);
    if (dockEl) dockEl.classList.add("active");
    
    const el = $(`#task-${id}`);
    el.show().css({ opacity: 0 }).animate(
        { opacity: 1 },
        { duration: 75 }
    );
}


function refTask(id) {
    const el = getEBD(`task-${id}-iframe`);
    if (el) el.contentWindow.location.reload();
    else noti(`Failed to refresh ${pretty(id)}`);
}

function endTask(id) {
    const el = $(`#task-${id}`);
    delete processes[id];
    delete processAppMeta[id];
    dock.icon.remove(id);
    
    
    el.animate(
        { opacity: 0, top: '-=-200px' },
        {
            duration: 75,
            complete() {
                const element = getEBD(`task-${id}`);
                if (element) element.remove();
            }
        }
    );
}

function toggleFullscreen(id) {
    const taskDiv = getEBD(`task-${id}`);
    const pkg = processAppMeta[id];
    if (!taskDiv) return;
    
    const isFull = taskDiv.dataset.fullscreen === 'true';
    const canResize = pkg.window?.resizable || false;
    
    if (!isFull) {
        taskDiv.dataset.prevLeft = taskDiv.style.left || '0px';
        taskDiv.dataset.prevTop = taskDiv.style.top || '0px';
        taskDiv.dataset.prevWidth = taskDiv.style.width || taskDiv.offsetWidth + 'px';
        taskDiv.dataset.prevHeight = taskDiv.style.height || taskDiv.offsetHeight + 'px';
        
        taskDiv.classList.remove('resizable');
        
        taskDiv.style.left = '0px';
        taskDiv.style.top = '0px';
        taskDiv.style.width = '100vw';
        taskDiv.style.height = 'calc(100vh - 2.1em)';
        taskDiv.dataset.fullscreen = 'true';
    } else {
        if (canResize) taskDiv.classList.add('resizable');
        taskDiv.style.left = taskDiv.dataset.prevLeft;
        taskDiv.style.top = taskDiv.dataset.prevTop;
        taskDiv.style.width = taskDiv.dataset.prevWidth;
        taskDiv.style.height = taskDiv.dataset.prevHeight;
        taskDiv.dataset.fullscreen = 'false';
    }
}