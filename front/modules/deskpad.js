window.deskpad = {
    async init() {
        console.log("[Deskpad] Loading...");

        const deskpad = getEBD('deskpad');
        deskpad.style.cursor = "wait";

        let installedApps = [];

        try {
            // Build the list of installed apps
            const appFolderList = await window.ndutil.listDirectory('apps');
            for (const file of appFolderList) {
                if (file.includes('.')) continue;
                const indexPath = await window.ndutil.pathjoin(['apps', file, 'index.html']);
                const pkgPath = await window.ndutil.pathjoin(['apps', file, 'pkg.json']);
                if (await window.ndutil.fileExists(indexPath) && await window.ndutil.fileExists(pkgPath)) {
                    installedApps.push(file);
                }
            }

            // Add to deskpad
            for (const app of installedApps) {
                // Get app package
                let packageFile;
                try {
                    packageFile = await window.ndutil.readJSON(['apps', app, 'pkg.json']);
                } catch (e) {
                    console.error('Failed to append app to deskpad, package unresolved: ' + app);
                    continue;
                }

                // Determine image
                let imgPath;
                if (await window.ndutil.fileExists(['apps', app, `${app}.png`])) {
                    imgPath = `dynamic/apps/${app}/${app}.png`;
                } else if (await window.ndutil.fileExists(['apps', app, 'favicon.png'])) {
                    imgPath = `dynamic/apps/${app}/favicon.png`;
                } else {
                    imgPath = `img/app.png`; // fallback
                }

                // Append to deskpad
                const appContainer = newEl('div');
                appContainer.classList.add('app');
                appContainer.addEventListener('click', () => newTask(app));

                let appName = packageFile.displayName ?? app;
                appContainer.innerHTML = `
                <img alt="${app} icon" src="${imgPath}">
                ${pretty(appName)}
            `;

                deskpad.appendChild(appContainer);
                installedApps[app] = appContainer;
            }

            deskpad.style.cursor = "inherit";
        } catch (err) {
            console.warn("[Deskpad] Error reading installed apps:", err?.message ?? err);
            return;
        } finally {
            deskpad.style.cursor = "inherit";
        }

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