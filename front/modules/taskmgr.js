const processes = {};
let processAppMeta = {};

function minimizeAllExcept(id) {
    for (const otherAppId in processes) {
        if (otherAppId !== id && processes[otherAppId]?.active) {
            minTask(otherAppId);
        }
    }
}

async function newTask(id) {
    if (processes[id]) return resTask(id);
    minimizeAllExcept(id);
    
    let appMeta = await window.ndutil.readJSON(`apps/${id}/pkg.json`);
    if (appMeta) {
        processAppMeta[id] = { version: appMeta.version };
    }
    
    const taskElement = $('<div>', { class: 'task', id: `task-${id}` });
    const taskBar = $('<div>', { class: 'bar' });
    
    const closeBtn = $('<button>').text('X').on('click', () => endTask(id));
    const minBtn = $('<button>').text('-').on('click', () => minTask(id));
    const taskLabel = $('<span>').text(pretty(id));
    
    taskBar.append(taskLabel);
    taskBar.append(closeBtn, minBtn);
    taskElement.append(taskBar);
    
    const iframe = $('<iframe>', { src: `apps/${id}/index.html`, id: `task-${id}-iframe` });
    taskElement.append(iframe);
    
    processes[id] = { active: true };
    $('body').append(taskElement);
    
    let appImgFormat;
    const imgFormat1 = await window.ndutil.fileExists(['apps', id, `${id}.png`]);
    appImgFormat = imgFormat1 ? id : "favicon";
    appImg = `apps/${id}/${appImgFormat}.png`;
    
    dock.icon.new(appImg, id);
    getEBD(`${id}-dock`).classList.add("active");
    
    taskElement.css({ opacity: 0, transform: 'scale(0.8)' }).show().animate(
        { opacity: 1 },
        {
            duration: 200,
            step: function(now) {
                const scale = 0.8 + 0.2 * now + 0.05 * Math.sin(now * Math.PI * 3);
                $(this).css('transform', `scale(${scale})`);
            }
        }
    );
}

function minTask(id) {
    const el = $(`#task-${id}`);
    if (!processes[id]) return;
    
    processes[id].active = false;
    getEBD(`${id}-dock`).classList.remove("active");
    
    el.animate({ opacity: 0, top: '+=50px' }, {
        duration: 200,
        complete: () => el.hide().css({ top: '0px' })
    });
}

function resTask(id) {
    if (!processes[id]) return;
    
    minimizeAllExcept(id);
    
    const el = $(`#task-${id}`);
    processes[id].active = true;
    getEBD(`${id}-dock`).classList.add("active");
    
    el.show().css({ opacity: 0, top: '50px' });
    el.animate({ opacity: 1, top: '0px' }, { duration: 200 });
}

function endTask(id) {
    const el = $(`#task-${id}`);
    
    delete processes[id];
    delete processAppMeta[id];
    
    dock.icon.remove(id);
    
    el.animate(
        { opacity: 0, top: '-=50px' },
        {
            duration: 200,
            step: function(now) {
                const scale = 1 - 0.2 * now;
                $(this).css('transform', `scale(${scale})`);
            },
            complete: function() {
                const element = getEBD(`task-${id}`);
                if (element) element.remove();
            }
        }
    );
}

async function openTaskMgr() {
    const container = getEBD('taskMgrContainer');
    const content = getEBD('taskMgrContent');
    
    async function loadContent() {
        content.innerHTML = "";
        
        for (const app of Object.keys(processes)) {
            const itemContainer = newEl('div');
            const itemImg = newEl('img');
            const itemTextContainer = newEl('div');
            const itemName = newEl('span');
            const itemVer = newEl('span');
            const endTaskBtn = newEl('button');
            
            itemContainer.classList.add('taskMgrItem');
            
            let appImgFormat;
            const imgFormat1 = await window.ndutil.fileExists(['apps', app, `${app}.png`]);
            appImgFormat = imgFormat1 ? app : "favicon";
            itemImg.src = `apps/${app}/${appImgFormat}.png`;
            
            itemTextContainer.classList.add('taskMgrItemText');
            
            itemName.textContent = `App: ${pretty(app)}`;
            const itemVersion = processAppMeta[app]?.version || "Not found";
            itemVer.textContent = `Version: ${itemVersion}`;
            
            endTaskBtn.innerHTML = `<img src="img/not-allowed.png">End Task`;
            endTaskBtn.onclick = () => {
                try {
                    endTask(app);
                } catch (e) {
                    noti("Failed to end task");
                    studio.log.new("error", `[TASKMGR] Failed to end task ${app}: ${e}`);
                    loadContent();
                    return;
                }
                if (prefs?.loaded.taskEndNoti) noti(`Ended task: ${pretty(app)}`);
                loadContent();
            };
            
            itemContainer.appendChild(itemImg);
            
            itemTextContainer.appendChild(itemName);
            itemTextContainer.appendChild(itemVer);
            itemContainer.appendChild(itemTextContainer);    // ← THIS WAS MISSING
            
            itemContainer.appendChild(endTaskBtn);
            content.appendChild(itemContainer);
        }
    }
    
    
    try {
        if (Object.keys(processes).length > 0) {
            loadContent();
        } else {
            content.innerHTML = `<div class="middle"><p>No apps are running</p></div>`;
        }
    } catch (err) {
        studio.log.new("error", `[TASKMGR] Failed to open task manager popup: ${err}`);
    }
    
    $(container).fadeIn(75);
}

function closeTaskMgr() {
    const container = getEBD('taskMgrContainer');
    const content = getEBD('taskMgrContent');
    
    $(container).fadeOut(75, function() {
        content.innerHTML = "";
    });
}