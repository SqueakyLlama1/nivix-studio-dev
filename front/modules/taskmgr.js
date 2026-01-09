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
    
    const deskpad = getEBD('deskpad');
    if (!deskpad) {
        document.body.style.cursor = "auto";
        return;
    }
    
    const sysIndexPath = [id, 'index.html'];
    const userIndexPath = ['apps', id, 'index.html'];
    
    let sysExists = false;
    let userExists = false;
    
    try {
        sysExists = await window.ndutil.fileExists(sysIndexPath, 'sysapps');
        userExists = await window.ndutil.fileExists(userIndexPath);
    } catch {}
    
    if (!sysExists && !userExists) {
        sendCriticalFailure(`Requested app "${id}" could not be found (index.html missing)`);
        return;
    }
    
    const isSys = sysExists;
    const basePath = isSys ? [id] : ['apps', id];
    
    let pkg = {};
    try {
        pkg = await window.ndutil.readJSON([...basePath, 'pkg.json'], isSys ? 'sysapps' : undefined);
        if (!pkg || !pkg.version) throw null;
        
        pkg.window = pkg.window || {};
        pkg.lib = pkg.lib || {};
        pkg.displayName = pkg.displayName || pretty(id);
        pkg.window.resizable = pkg.window.resizable ?? true;
        pkg.window["titlebar-blocks"] = pkg.window["titlebar-blocks"] || [];
        pkg.lib.css = pkg.lib.css || [];
        pkg.lib.js = pkg.lib.js || [];
        pkg.darkIcon = pkg.darkIcon || "none";
    } catch {
        sendCriticalFailure(`App package file not found or invalid for "${id}"`);
        return;
    }
    
    processAppMeta[id] = pkg;
    
    const minWidth = Math.max(400, pkg.window.minWidth || 400);
    const minHeight = Math.max(400, pkg.window.minHeight || 400);
    
    const width = pkg.window.width || minWidth;
    const height = pkg.window.height || minHeight;
    
    let taskEl;
    try {
        taskEl = $('<div>', {
            class: 'task',
            id: `task-${id}`
        }).css({
            width: width + 'px',
            height: height + 'px',
            minWidth: minWidth + 'px',
            minHeight: minHeight + 'px',
            left: '0px',
            top: '0px',
            position: 'absolute'
        });
    } catch {
        sendCriticalFailure(`Failed to create task element for "${id}"`);
        return;
    }
    
    if (pkg.window.resizable) taskEl.addClass('resizable');
    
    let appImg = 'img/app.png';
    try {
        if (await window.ndutil.fileExists(isSys ? [id, `${id}.png`] : ['apps', id, `${id}.png`], isSys ? 'sysapps' : undefined)) {
            appImg = isSys ? `sysapps/${id}/${id}.png` : `dynamic/apps/${id}/${id}.png`;
        } else if (await window.ndutil.fileExists(isSys ? [id, 'favicon.png'] : ['apps', id, 'favicon.png'], isSys ? 'sysapps' : undefined)) {
            appImg = isSys ? `sysapps/${id}/favicon.png` : `dynamic/apps/${id}/favicon.png`;
        }
    } catch {}
    
    const barEl = $('<div>', { class: 'bar' });
    const labelEl = $('<span>').text(pkg.displayName);
    const imgEl = $('<img>', { src: appImg });
    
    const exitBtn = $('<button>').text('X').on('click', () => endTask(id));
    const fullscreenBtn = $('<button>')
    .text('❐')
    .prop('disabled', !pkg.window.resizable || pkg.window["titlebar-blocks"].includes('fullscreen'))
    .on('click', () => toggleFullscreen(id));
    const minBtn = $('<button>').text('－').on('click', () => minTask(id));
    const refreshBtn = $('<button>').text('⭮').on('click', () => refTask(id));
    
    barEl.append(exitBtn, fullscreenBtn, minBtn, refreshBtn, imgEl, labelEl);
    taskEl.append(barEl);
    
    const iframeSrc = isSys ? `sysapps/${id}/index.html` : `dynamic/apps/${id}/index.html`;
    const iframeEl = $('<iframe>', { src: iframeSrc, id: `task-${id}-iframe` });
    
    taskEl.append(iframeEl);
    $(deskpad).append(taskEl);
    
    processes[id] = { active: true };
    bringToFront(id);
    dock.icon.new(appImg, id);
    
    const dockEl = getEBD(`${id}-dock`);
    if (dockEl) dockEl.classList.add("active");
    
    taskEl.css({ opacity: 0, transform: 'scale(0.9)' }).show().animate(
        { opacity: 1 },
        { duration: 75, step(now) { taskEl.css('transform', `scale(${0.9 + 0.1 * now})`); } }
    );
    
    const taskDiv = taskEl[0];
    const barDiv = barEl[0];
    const iframe = iframeEl[0];
    
    Object.assign(taskDiv.dataset, {
        prevLeft: '0px',
        prevTop: '0px',
        prevWidth: width + 'px',
        prevHeight: height + 'px',
        fullscreen: 'false'
    });
    
    let savedTransition = taskDiv.style.transition;
    
    const dragShield = document.createElement('div');
    Object.assign(dragShield.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '999999',
        cursor: 'move',
        pointerEvents: 'auto',
        background: 'transparent',
        display: 'none'
    });
    document.body.appendChild(dragShield);
    
    
    taskDiv.addEventListener('mousedown', () => bringToFront(id));
    iframe.addEventListener('mousedown', () => bringToFront(id));
    
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    
    function startDrag(e) {
        if (taskDiv.dataset.fullscreen === 'true') return;
        
        const taskRect = taskDiv.getBoundingClientRect();
        const padRect = deskpad.getBoundingClientRect();
        const barRect = barDiv.getBoundingClientRect();
        
        offsetX = e.clientX - taskRect.left;
        offsetY = e.clientY - taskRect.top;
        
        isDragging = true;
        taskDiv.style.transition = 'none';
        dragShield.style.display = 'block';
        bringToFront(id);
        
        function move(ev) {
            if (!isDragging) return;
            
            let newLeft = ev.clientX - padRect.left - offsetX;
            let newTop = ev.clientY - padRect.top - offsetY;
            
            const barHeight = barRect.height;
            
            const minLeft = -taskRect.width + 40;
            const maxLeft = padRect.width - 40;
            
            const minTop = 0;
            const maxTop = padRect.height - barHeight;
            
            if (newLeft < minLeft) newLeft = minLeft;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop < minTop) newTop = minTop;
            if (newTop > maxTop) newTop = maxTop;
            
            taskDiv.style.left = newLeft + 'px';
            taskDiv.style.top = newTop + 'px';
        }
        
        function up() {
            isDragging = false;
            taskDiv.style.transition = savedTransition || '';
            dragShield.style.display = 'none';
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
        }
        
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
    }
    
    
    barDiv.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        startDrag(e);
    });
    
    taskDiv.addEventListener('mousedown', e => {
        if (!pkg.window.resizable) return;
        const rect = taskDiv.getBoundingClientRect();
        if (e.clientX > rect.right - 10 || e.clientY > rect.bottom - 10) {
            taskDiv.style.transition = 'none';
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (taskDiv.style.transition === 'none') {
            taskDiv.style.transition = savedTransition || '';
        }
    });
    
    iframe.addEventListener('load', async () => {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        
        for (const cssFile of pkg.lib.css) {
            try {
                if (await window.ndutil.fileExists(['lib', 'css', cssFile + '.css'], 'sysapps')) {
                    await assetLoader.load('css', `${studio.bind}/front/sysapps/lib/css/${cssFile}.css`, doc);
                }
            } catch {}
        }
        
        for (const jsFile of pkg.lib.js) {
            try {
                if (await window.ndutil.fileExists(['lib', 'js', jsFile + '.js'], 'sysapps')) {
                    await assetLoader.load('js', `${studio.bind}/front/sysapps/lib/js/${jsFile}.js`, doc);
                }
            } catch {}
        }
        
        if (pkg.executable) {
            const exePath = isSys
            ? `sysapps/${id}/${pkg.executable}`
            : `dynamic/apps/${id}/${pkg.executable}`;
            try { await assetLoader.load('js', `/front/${exePath}`, doc); } catch {}
        }
    });
    
    document.body.style.cursor = "auto";
    
    function sendCriticalFailure(message) {
        console.error(message);
        noti(`App "${id}" crashed: ${message}`);
        endTask(id);
    }
}

function emergencyWindowReset(e) {
    if (
        !e.ctrlKey ||
        !e.altKey ||
        !e.shiftKey ||
        e.key.toLowerCase() !== 'w'
    ) return;

    e.preventDefault();

    const deskpad = getEBD('deskpad');
    if (!deskpad) return;

    for (const id in processes) {
        const taskDiv = getEBD(`task-${id}`);
        const pkg = processAppMeta[id];

        if (!taskDiv) continue;
        if (taskDiv.style.display === 'none') continue;

        if (pkg?.window?.resizable === false) {
            taskDiv.style.left = '0px';
            taskDiv.style.top = '0px';
            continue;
        }

        if (taskDiv.dataset.fullscreen === 'true') {
            taskDiv.dataset.fullscreen = 'false';
            taskDiv.classList.add('resizable');
        }

        taskDiv.style.transition = 'none';

        taskDiv.style.left = '0px';
        taskDiv.style.top = '0px';
        taskDiv.style.width = '400px';
        taskDiv.style.height = '400px';

        taskDiv.dataset.prevLeft = '0px';
        taskDiv.dataset.prevTop = '0px';
        taskDiv.dataset.prevWidth = '400px';
        taskDiv.dataset.prevHeight = '400px';

        requestAnimationFrame(() => {
            taskDiv.style.transition = '';
        });
    }
}

window.addEventListener('keydown', emergencyWindowReset, true);

function minTask(id) {
    if (!processes[id]) return;
    processes[id].active = false;
    
    const dockEl = getEBD(`${id}-dock`);
    if (dockEl) dockEl.classList.remove("active");
    
    const el = $(`#task-${id}`);
    el.animate({ opacity: 0 }, { duration: 75, complete: () => el.hide() });
}

function resTask(id) {
    if (!processes[id]) return;
    processes[id].active = true;
    bringToFront(id);
    
    const dockEl = getEBD(`${id}-dock`);
    if (dockEl) dockEl.classList.add("active");
    
    const el = $(`#task-${id}`);
    el.show().css({ opacity: 0 }).animate({ opacity: 1 }, { duration: 75 });
}

function refTask(id) {
    const el = getEBD(`task-${id}-iframe`);
    if (el) el.contentWindow.location.reload();
}

function endTask(id) {
    const el = $(`#task-${id}`);
    delete processes[id];
    delete processAppMeta[id];
    dock.icon.remove(id);
    
    el.animate({ opacity: 0 }, {
        duration: 75,
        complete() {
            const element = getEBD(`task-${id}`);
            if (element) element.remove();
        }
    });
}

function toggleFullscreen(id) {
    const taskDiv = getEBD(`task-${id}`);
    const pkg = processAppMeta[id];
    if (!taskDiv) return;
    
    const isFull = taskDiv.dataset.fullscreen === 'true';
    
    if (!isFull) {
        taskDiv.dataset.prevLeft = taskDiv.style.left;
        taskDiv.dataset.prevTop = taskDiv.style.top;
        taskDiv.dataset.prevWidth = taskDiv.style.width;
        taskDiv.dataset.prevHeight = taskDiv.style.height;
        
        taskDiv.classList.remove('resizable');
        taskDiv.style.left = '0px';
        taskDiv.style.top = '0px';
        taskDiv.style.width = '100%';
        taskDiv.style.height = '100%';
        taskDiv.dataset.fullscreen = 'true';
    } else {
        if (pkg.window.resizable) taskDiv.classList.add('resizable');
        taskDiv.style.left = taskDiv.dataset.prevLeft;
        taskDiv.style.top = taskDiv.dataset.prevTop;
        taskDiv.style.width = taskDiv.dataset.prevWidth;
        taskDiv.style.height = taskDiv.dataset.prevHeight;
        taskDiv.dataset.fullscreen = 'false';
    }
}

document.addEventListener('keydown', e => {
    if (!(e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyW')) return;
    
    for (const id in processes) {
        const taskDiv = getEBD(`task-${id}`);
        const meta = processAppMeta[id];
        if (!taskDiv) continue;
        
        taskDiv.dataset.fullscreen = 'false';
        taskDiv.style.left = '0px';
        taskDiv.style.top = '0px';
        
        if (meta.window.resizable !== false) {
            taskDiv.style.width = '400px';
            taskDiv.style.height = '400px';
        }
    }
});