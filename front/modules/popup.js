// ======================
// Popup Manager
// ======================

class PopupManager {
    constructor() {
        // Removed: this.activePopup = null;
    }
    open(popupEl) {
        if (!popupEl) return;
        // Removed: if (this.activePopup === popupEl) return;
        
        // Removed: this.activePopup = popupEl;
        $(popupEl)
        .stop(true, true)
        .css("display", "flex")
        .hide()
        .fadeIn(75);
    }
    
    async close(popupEl) {
        return new Promise((resolve) => {
            // Changed: Removed check for activePopup !== popupEl
            if (!popupEl) {
                resolve();
                return;
            }
            
            $(popupEl)
            .stop(true, true)
            .fadeOut(75, () => {
                popupEl.style.display = "none";
                // Removed: this.activePopup = null;
                resolve();
            });
        });
    }
    
    resetImage(imgEl, fallback = "img/na.png") {
        if (!imgEl) return;
        imgEl.src = fallback;
    }
    
    resetButton(btnEl) {
        if (!btnEl) return null;
        const clone = btnEl.cloneNode(true);
        btnEl.replaceWith(clone);
        return clone;
    }
    
    setText(el, text = "") {
        if (el) el.textContent = text;
    }
}

const popupManager = new PopupManager();

// ======================
// Popup Utility Wrappers
// ======================

const showPopup = popup => popupManager.open(popup);
const resetButton = btn => popupManager.resetButton(btn);
const hidePopup = popup => popupManager.close(popup);

// ======================
// INSTALL POPUP
// ======================

async function openInstallPopup(appId) {
    try {
        const popup = getEBD("installPopupContainer");
        const nameEl = getEBD("IP_TTL");
        const descEl = getEBD("IP_DESC");
        const imgEl = getEBD("IP_I");
        
        let installBtn = getEBD("IP_INSTALL");
        let closeBtn = getEBD("IP_CLOSE");
        
        if (!popup || !nameEl || !descEl || !imgEl || !installBtn || !closeBtn) return;
        
        // Removed: if (popupManager.activePopup === popup) return;
        
        installBtn = resetButton(installBtn);
        closeBtn = resetButton(closeBtn);
        
        nameEl.textContent = pretty(appId);
        descEl.textContent = "Loading description...";
        imgEl.src = `https://www.nivixtech.com/studio/${appId}.png`;
        imgEl.onerror = () => (imgEl.src = "img/na.png");
        
        showPopup(popup);
        
        closeBtn.onclick = () => close();
        
        async function close() {
            await popupManager.close(popup);
            nameEl.textContent = "---";
            descEl.textContent = "---";
            popupManager.resetImage(imgEl);
        }
        
        const ping = await window.ndutil.ping("https://www.nivixtech.com");
        if (!ping?.reachable) {
            descEl.textContent = "Unable to load description.";
            installBtn.disabled = true;
            return;
        }
        
        try {
            const url = await window.ndutil.cacheFile(`https://www.nivixtech.com/studio/${appId}.json`);
            const json = await window.ndutil.readJSON(url.path);
            descEl.textContent = json.description || "No description available.";
        } catch {
            descEl.textContent = "Unable to load description.";
        }
        
        installBtn.disabled = false;
        installBtn.textContent = "Install";
        installBtn.onclick = () => installApp(appId, installBtn);
        
    } catch (err) {
        studio.log.new("error", "openInstallPopup failed:", err);
    }
}

// ======================
// APP POPUP
// ======================

async function openAppPopup(app) {
    try {
        const popup = getEBD("appPopupContainer");
        if (!popup) return;

        let pkg = { version: "Unknown" };
        try {
            pkg = await window.ndutil.readJSON(["apps", app, "pkg.json"]);
        } catch {}
        
        const nameEl = getEBD("AP_TTL");
        const verEl = getEBD("AP_VER");
        const imgEl = getEBD("AP_IMG");
        
        let openBtn = getEBD("AP_OPN");
        let updateBtn = getEBD("AP_UPD");
        let uninstallBtn = getEBD("AP_UNSTL");
        let closeBtn = getEBD("AP_CLS");
        let uninstallMsg = getEBD("AP_UNSTL_MSG");
        
        if (!nameEl || !verEl || !imgEl) return;
        
        // Reset and assign new buttons
        openBtn = resetButton(openBtn);
        updateBtn = resetButton(updateBtn);
        uninstallBtn = resetButton(uninstallBtn);
        closeBtn = resetButton(closeBtn);
        
        // Set up default disabled/message state
        uninstallBtn.disabled = true;
        updateBtn.disabled = true; // Disabled by default
        updateBtn.textContent = "Update";

        // FIX: Set the message text here so it displays if the app IS running.
        uninstallMsg.textContent = "App must be closed to uninstall or update";
        
        nameEl.textContent = pretty(app);
        verEl.textContent = pkg.version;
        
        // Compatibility layer for 0.1.0 (kept as-is)
        let appImgFormat;
        const imgFormat1 = await window.ndutil.fileExists(['apps', app, `${app}.png`]);
        if (imgFormat1) {
            appImgFormat = app;
        } else {
            appImgFormat = "favicon";
        }
        imgEl.src = `apps/${app}/${appImgFormat}.png`;
        imgEl.onerror = () => popupManager.resetImage(imgEl);
        
        showPopup(popup);
        
        async function close() {
            await popupManager.close(popup);
            nameEl.textContent = "---";
            verEl.textContent = "---";
            popupManager.resetImage(imgEl);
        }

        closeBtn.onclick = close;
        
        openBtn.onclick = () => { newTask(app); close(); };
        
        // Check if the app is currently running
        const isRunning = processes[app] === true || processes[app] === false;

        // Logic for UNINSTALL and UPDATE buttons
        if (!isRunning) {
            // App is NOT running: Enable buttons and clear the message
            uninstallBtn.disabled = false;
            uninstallMsg.textContent = ""; // Clear the message
            
            // Check for updates (only if not running)
            if (typeof updatesAvailable !== "undefined" && updatesAvailable.includes(app)) {
                updateBtn.disabled = false;
                updateBtn.onclick = () => installApp(app, updateBtn);
            }
        }

        const isNotSupported = notSupported.includes(app);
        if (isNotSupported) {
            openBtn.disabled = true;
            uninstallMsg.textContent = "This app is not supported by your version of Studio. Please update if available";
        }
        
        // The buttons remain disabled and the message remains set if isRunning is true.
        
        uninstallBtn.onclick = () => { uninstallAsk(app); close(); };
        
    } catch (err) {
        studio.log.new("error", `openAppPopup failed: ${err}`);
    }
}

// ======================
// ASK POPUP HELPER
// ======================

function uninstallAsk(app) {
    const popup = getEBD("UNST_AKP");
    if (!popup) return;
    // Removed: if (popupManager.activePopup === popup) return;
    
    const msgEl = getEBD("UNST_MSG");
    const cbEl = getEBD("UNST_CB");
    let yesBtn = getEBD("UNST_YES");
    let noBtn = getEBD("UNST_NO");
    
    if (!msgEl || !cbEl || !yesBtn || !noBtn) return;
    
    yesBtn = popupManager.resetButton(yesBtn);
    noBtn = popupManager.resetButton(noBtn);
    
    msgEl.textContent = `Uninstall ${pretty(app)}?`;
    cbEl.checked = false;
    
    showPopup(popup);
    
    async function close() {
        await hidePopup(popup);
        msgEl.textContent = "---";
        cbEl.checked = false;
    }
    
    yesBtn.onclick = () => {
        const delData = cbEl.checked;
        uninstallApp(app, delData);
        close();
    };
    
    noBtn.onclick = close;
}