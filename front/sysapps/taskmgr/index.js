async function init() {
    const content = getEBD('content');
    const processes = window.parent?.processes || {};
    const processAppMeta = window.parent?.processAppMeta || {};
    const endTaskFn = typeof window.parent?.endTask === "function" ? window.parent.endTask : null;
    const notifyFn = typeof window.parent?.noti === "function" ? window.parent.noti : null;
    const prefs = window.parent?.prefs?.loaded || {};

    const ROOT = "http://127.0.0.1:58000";

    async function resolveAppIcon(appId, pkg) {
        const ndutil = window.parent?.ndutil;
        if (!ndutil) return `img/na.png`;

        const isSys = pkg?.type === "sysapp";

        const iconUrl = isSys
            ? `${ROOT}/sysapps/${appId}/${appId}.png`
            : `${ROOT}/userdata/apps/${appId}/${appId}.png`;

        try {
            const exists = await ndutil.fileExists(
                isSys ? [appId, `${appId}.png`] : ["apps", appId, `${appId}.png`],
                isSys ? "sysapps" : undefined
            );
            if (exists) return iconUrl;
        } catch (e) {
            console.warn(`[TASKMGR] Icon check failed for ${appId}`, e);
        }

        return `img/na.png`;
    }

    async function loadContent() {
        content.innerHTML = "";

        for (const appId of Object.keys(processes)) {
            const pkg = processAppMeta[appId] || {};

            const itemContainer = newEl('div');
            const itemImg = newEl('img');
            const itemTextContainer = newEl('div');
            const itemName = newEl('span');
            const itemID = newEl('span');
            const itemVer = newEl('span');
            const endTaskBtn = newEl('button');

            itemContainer.classList.add('item');
            itemTextContainer.classList.add('itemText');

            itemImg.src = await resolveAppIcon(appId, pkg);

            itemName.textContent = `Name: ${pkg.displayName || pretty(appId)}`;
            itemID.textContent = `ID: ${appId}`;
            itemVer.textContent = `Version: ${pkg.version || "Not found"}`;

            endTaskBtn.innerHTML = `<img src="img/et.png">End Task`;
            endTaskBtn.onclick = () => {
                if (!endTaskFn) {
                    notifyFn?.("End task function unavailable");
                    return;
                }

                try {
                    endTaskFn(appId);
                    if (prefs.taskEndNoti) notifyFn?.(`Ended task: ${pretty(appId)}`);
                    loadContent();
                } catch (e) {
                    notifyFn?.("Failed to end task");
                    console.error(`[TASKMGR] Failed to end task ${appId}`, e);
                }
            };

            itemTextContainer.append(itemName, itemID, itemVer);
            itemContainer.append(itemImg, itemTextContainer, endTaskBtn);
            content.appendChild(itemContainer);
        }
    }

    try {
        if (Object.keys(processes).length) {
            await loadContent();
        } else {
            content.innerHTML = `<div class="middle"><p>No apps are running</p></div>`;
        }
    } catch (err) {
        console.error(`[TASKMGR] Failed to load task manager`, err);
        notifyFn?.("Failed to open task manager");
    }
}

init();