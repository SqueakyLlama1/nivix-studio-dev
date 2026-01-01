const dock = {
    icon: {
        new(icon, app) {
            const dockContent = getEBD('dockContent');
            const iconContainer = document.createElement('button');
            iconContainer.id = `${app}-dock`;
            const iconImg = document.createElement('img');
            iconImg.src = icon;
            iconContainer.appendChild(iconImg);
            dockContent.appendChild(iconContainer);
            iconContainer.onclick = () => { dock.icon.minRes(app) };
        },
        remove(app) {
            const iconElement = getEBD(`${app}-dock`);
            if (iconElement) iconElement.parentNode.removeChild(iconElement);
        },
        minRes(app) {
            const entry = processes[app];

            if (!entry) {
                endTask(app);
                noti(`${pretty(app)} Crashed`);
                studio.log.new("error", `${app} Crashed`);
                return;
            }

            if (entry.active === true) {
                minTask(app);
                return;
            }

            if (entry.active === false) {
                resTask(app);
                return;
            }

            endTask(app);
            noti(`${pretty(app)} Crashed`);
            studio.log.new("error", `${app} Crashed`);
        }
    },
    element: getEBD('dock'),
    async open() {
        return new Promise(async resolve => {
            const el = dock.element;
            document.body.style.overflow = "hidden";
            el.style.display = "flex";
            await wait(50);
            el.style.bottom = "0";
            await wait(500);
            document.body.style.overflow = "auto";
            resolve();
        });
    },
    async close() {
        return new Promise(async resolve => {
            const el = dock.element;
            document.body.style.overflow = "hidden";
            el.style.bottom = "-2.1em";
            await wait(500);
            el.style.display = "none";
            document.body.style.overflow = "auto";
            resolve();
        });
    }
};

const restartBtn = getEBD('restartBtn');
const exitBtn = getEBD('exitBtn');
const taskMgrBtn = getEBD('taskMgrBtn');
const taskMgrCloseBtn = getEBD('taskMgrClose');

if (restartBtn) restartBtn.addEventListener('click', () => {
    studio.log.new("log", "[System] Restart requested");
    location.reload();
});
if (exitBtn) exitBtn.addEventListener('click', studio.exit);
if (taskMgrBtn) taskMgrBtn.addEventListener('click', openTaskMgr);
if (taskMgrCloseBtn) taskMgrCloseBtn.addEventListener('click', closeTaskMgr);