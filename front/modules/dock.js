window.dock = {
    icon: {
        new(icon, app) {
            const dockContent = getEBD('dockContent');
            if (!dockContent) return;
            
            // Avoid duplicates
            if (getEBD(`${app}-dock`)) return;
            
            const iconContainer = document.createElement('button');
            iconContainer.id = `${app}-dock`;
            iconContainer.classList.add('dock-icon');
            
            const iconImg = document.createElement('img');
            iconImg.src = icon;
            iconContainer.appendChild(iconImg);
            
            // Click toggles minimize/restore for this app
            iconContainer.onclick = () => dock.icon.minRes(app);
            
            dockContent.appendChild(iconContainer);
        },
        
        remove(app) {
            const iconElement = getEBD(`${app}-dock`);
            if (iconElement) iconElement.remove();
        },
        
        minRes(app) {
            const taskEntry = processes[app];
            if (!taskEntry) {
                endTask(app);
                noti(`${pretty(app)} Crashed`);
                console.error(`${app} Crashed`);
                return;
            }
            
            const taskDiv = getEBD(`task-${app}`);
            if (!taskDiv) return;
            
            // Fullscreen handling
            if (taskDiv.dataset.fullscreen === 'true') {
                toggleFullscreen(app);
                return;
            }
            
            // Toggle between minimized/restored
            if (taskEntry.active === true) {
                minTask(app);
            } else if (taskEntry.active === false) {
                resTask(app);
            }
        },
        
        highlight(app, state) {
            const iconEl = getEBD(`${app}-dock`);
            if (!iconEl) return;
            if (state) iconEl.classList.add('active');
            else iconEl.classList.remove('active');
        }
    },
    
    element: getEBD('dock'),

    init() {
        const taskMgrBtn = getEBD('dock-taskMgrBtn');
        const refreshBtn = getEBD('dock-restartBtn');
        const exitBtn = getEBD('dock-exitBtn');

        taskMgrBtn.addEventListener('click', () => newTask('taskmgr', 'sysapps'));
        refreshBtn.addEventListener('click', () => window.location.reload());
        exitBtn.addEventListener('click', function() {
            try { studio.exit(); } catch { window.location.close(); }
        });
    },
    
    async open() {
        const el = dock.element;
        if (!el) return;
        el.style.display = 'flex';
        await wait(50);
        el.style.bottom = '0';
        await wait(525);
    },
    
    async close() {
        const el = dock.element;
        if (!el) return;
        el.style.bottom = '-2.1em';
        await wait(525);
        el.style.display = 'none';
    }
};

// Update dock icons whenever task state changes
function updateDockIcon(app) {
    const entry = processes[app];
    dock.icon.highlight(app, entry?.active === true);
}

// Hook into task functions to update dock
const origMinTask = minTask;
minTask = function(id) {
    origMinTask(id);
    updateDockIcon(id);
};

const origResTask = resTask;
resTask = function(id) {
    origResTask(id);
    updateDockIcon(id);
};

const origEndTask = endTask;
endTask = function(id) {
    origEndTask(id);
    dock.icon.remove(id);
};