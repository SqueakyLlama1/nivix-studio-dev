window.deskpad = {
    async init() {
        console.log("[Deskpad] Loading...");
        
        const deskpad = getEBD('deskpad');
        deskpad.style.cursor = "wait";
        
        let installedApps = [];
        
        // Build the list of installed apps
        try {
            const appFolderList = await window.ndutil.listDirectory('apps');
            for (const file of appFolderList) {
                if (file.includes('.')) continue;
                const indexPath = await window.ndutil.pathjoin(['apps', file, 'index.html']);
                const pkgPath = await window.ndutil.pathjoin(['apps', file, 'pkg.json']);
                if (await window.ndutil.fileExists(indexPath) && await window.ndutil.fileExists(pkgPath)) {
                    installedApps.push(file);
                }
            }
        } catch (err) {
            console.warn("[Deskpad] Error reading installed apps:", err.message);
            return;
        }
        
        // Add to deskpad
        for (const app of installedApps) {
            // Get app package
            let packageFile;
            try {
                packageFile = await window.ndutil.readJSON(['apps', app, 'pkg.json']);
            } catch(e) {
                console.error('Failed to append app to deskpad, package unresolved: ' + id);
                return;
            }
            
            // Append to deskpad
            const appContainer = newEl('div');
            appContainer.classList.add('app');
            appContainer.addEventListener('click', () => newTask(app));
            
            let imgName = "favicon";
            if (await window.ndutil.fileExists(['apps', app, `${app}.png`])) imgName = app;
            
            let appName = packageFile.displayName ?? app;
            appContainer.innerHTML = `
            <img alt="${app} icon" src="userdata/apps/${app}/${imgName}.png">
            ${pretty(appName)}
        `;
            
            deskpad.appendChild(appContainer);
            installedApps[app] = appContainer;
        }

        deskpad.style.cursor = "inherit";
        
        console.log(`[Deskpad] Done. Installed: ${installedApps.length}`);
    },
    
    async refresh() {
        // Re-initialize
        await wait(50); // To assure the user it reloaded
        getEBD('deskpad').innerHTML = "";
        await this.init();
        console.log('[Deskpad] Deskpad refresh finished');
    }
};