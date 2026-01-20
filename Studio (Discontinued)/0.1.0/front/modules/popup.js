// ======================
// Popup Manager (Improved)
// ======================

class PopupManager {
    constructor() {
        this.activePopup = null;
    }

    open(popupEl) {
        if (!popupEl) return;
        if (this.activePopup === popupEl) return;

        this.activePopup = popupEl;
        popupEl.style.display = "flex";

        requestAnimationFrame(() => {
            popupEl.style.opacity = "1";
        });
    }

    close(popupEl) {
        if (!popupEl || this.activePopup !== popupEl) return;

        popupEl.style.opacity = "0";

        setTimeout(() => {
            popupEl.style.display = "none";
            if (this.activePopup === popupEl) this.activePopup = null;
        }, 200);
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

    /* OPTIONAL: safe text setter */
    setText(el, text = "") {
        if (el) el.textContent = text;
    }
}

const popupManager = new PopupManager();


// ======================
// Popup Utility Wrappers
// ======================

const showPopup = popup => popupManager.open(popup);
const hidePopup = popup => popupManager.close(popup);
const resetButton = btn => popupManager.resetButton(btn);


// ======================
// INSTALL POPUP
// ======================

async function openInstallPopup(appId) {
    try {
        const popup = getEBD("installPopupContainer");
        const nameEl = getEBD("IP_NAME");
        const descEl = getEBD("IP_DESC");
        const imgEl = getEBD("IP_I");

        let installBtn = getEBD("IP_INSTALL");
        let closeBtn = getEBD("IP_CLOSE");

        if (!popup || !nameEl || !descEl || !imgEl || !installBtn || !closeBtn) {
            console.warn("InstallPopup missing elements.");
            return;
        }

        // Prevent double-open
        if (popupManager.activePopup === popup) return;

        // Reset buttons (remove old listeners)
        installBtn = resetButton(installBtn);
        closeBtn = resetButton(closeBtn);

        // Initial UI
        nameEl.textContent = pretty(appId);
        descEl.textContent = "Loading description...";
        imgEl.src = `https://www.nivixtech.com/studio/${appId}.png`;
        imgEl.onerror = () => (imgEl.src = "img/na.png");

        showPopup(popup);

        // Close logic
        closeBtn.onclick = () => close();

        function close() {
            hidePopup(popup);
            nameEl.textContent = "---";
            descEl.textContent = "---";
            popupManager.resetImage(imgEl);
        }

        // Connectivity check
        const ping = await window.ndutil.ping("https://www.nivixtech.com");
        if (!ping?.reachable) {
            descEl.textContent = "Unable to load description.";
            installBtn.disabled = true;
            return;
        }

        // Load JSON description
        try {
            const url = `https://www.nivixtech.com/studio/${appId}.json`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP error");

            const json = await res.json();
            descEl.textContent = json.description || "No description available.";
        } catch (err) {
            descEl.textContent = "Unable to load description.";
            console.error("InstallPopup JSON error:", err);
        }

        // Install handler
        installBtn.disabled = false;
        installBtn.textContent = "Install";
        installBtn.onclick = () => installApp(appId, installBtn);

    } catch (err) {
        console.error("openInstallPopup failed:", err);
    }
}



// ======================
// APP POPUP
// ======================

async function openAppPopup(app) {
    try {
        // Prevent double-open
        const popup = getEBD("appPopupContainer");
        if (!popup) return;
        if (popupManager.activePopup === popup) return;

        // Load pkg.json
        let pkg = { version: "Unknown" };
        try {
            const pkgPath = await window.ndutil.pathjoin(["apps", app, "pkg.json"]);
            pkg = await window.ndutil.readJSON(pkgPath);
        } catch {
            console.warn("pkg.json missing for", app);
        }

        // Element refs
        const nameEl = getEBD("AP_TTL");
        const verEl = getEBD("AP_VER");
        const imgEl = getEBD("AP_IMG");

        let openBtn = getEBD("AP_OPN");
        let preloadBtn = getEBD("AP_PRLD");
        let updateBtn = getEBD("AP_UPD");
        let uninstallBtn = getEBD("AP_UNSTL");
        let closeBtn = getEBD("AP_CLS");
        let uninstallMsg = getEBD("AP_UNSTL_MSG");

        if (!nameEl || !verEl || !imgEl) {
            console.warn("AppPopup missing elements.");
            return;
        }

        // Reset buttons
        openBtn = resetButton(openBtn);
        preloadBtn = resetButton(preloadBtn);
        updateBtn = resetButton(updateBtn);
        uninstallBtn = resetButton(uninstallBtn);
        closeBtn = resetButton(closeBtn);

        uninstallBtn.disabled = true;
        updateBtn.textContent = "Update";
        uninstallMsg.textContent = "App must be closed to uninstall or update";

        // UI setup
        nameEl.textContent = pretty(app);
        verEl.textContent = pkg.version;
        imgEl.src = `http://127.0.0.1:58000/apps/${app}/favicon.png`;
        imgEl.onerror = () => popupManager.resetImage(imgEl);

        showPopup(popup);

        // Close handler
        closeBtn.onclick = close;

        function close() {
            hidePopup(popup);
            nameEl.textContent = "---";
            verEl.textContent = "---";
            popupManager.resetImage(imgEl);
        }

        // Open app
        openBtn.onclick = () => {
            newTask(app);
            close();
        };

        // Preload/minimize
        preloadBtn.onclick = () => {
            newTask(app);
            minTask(app);
            close();
        };

        // Update button
        if (typeof updatesAvailable !== "undefined" && updatesAvailable.includes(app) && !processes.includes(app)) {
            updateBtn.disabled = false;
            updateBtn.onclick = () => installApp(app, updateBtn);
        } else {
            updateBtn.disabled = true;
        }

        // Uninstall allowed only if not running
        if (typeof processes !== "undefined" && !processes.includes(app)) {
            uninstallBtn.disabled = false;
            uninstallMsg.textContent = "";
        }

        // Uninstall logic
        uninstallBtn.onclick = () => {
            createUninstallAsk(app);
            close();
        };

    } catch (err) {
        console.error("openAppPopup failed:", err);
    }
}

// ======================
// ASK POPUP
// ======================

function askPopup(content) {
    const node = popupManager.injectHTML(content);
    if (node) document.body.appendChild(node);
}



// ======================
// ASK POPUP HELPER
// ======================

function createUninstallAsk(app) {
    const popup = getEBD("UNST_AKP");
    if (!popup) {
        console.warn("UNST_AKP popup container missing.");
        return;
    }

    // Prevent double-open
    if (popupManager.activePopup === popup) return;

    // Element refs
    const msgEl = getEBD("UNST_MSG");
    const cbEl = getEBD("UNST_CB");
    let yesBtn = getEBD("UNST_YES");
    let noBtn = getEBD("UNST_NO");

    if (!msgEl || !cbEl || !yesBtn || !noBtn) {
        console.warn("UninstallAsk missing elements.");
        return;
    }

    // Reset buttons
    yesBtn = popupManager.resetButton(yesBtn);
    noBtn = popupManager.resetButton(noBtn);

    // Setup UI
    msgEl.textContent = `Uninstall ${pretty(app)}?`;
    cbEl.checked = false;

    // Show popup
    popupManager.open(popup);

    // Close helper
    function close() {
        popupManager.close(popup);
        msgEl.textContent = "---";
        cbEl.checked = false;
    }

    // Bind handlers
    yesBtn.onclick = () => {
        const delData = cbEl.checked;
        uninstallApp(app, delData);
        getEBD('appPopupContainer').style.display = 'none';
        close();
    };

    noBtn.onclick = close;
}