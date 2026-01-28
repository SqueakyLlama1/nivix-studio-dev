const storetabs = {
    header: "[STORE TABS] ",
    load: {
        setVersion() {
            const vs = getEBD('load-footer-ver');
            if (vs && meta.sessionVersion) vs.textContent = `v${meta.sessionVersion}`;
        }
    },
    init: {
        select_space: {
            async init() {
                const ndutil = window.parent.ndutil;

                const quitBtn = getEBD("select-space-quit");
                const contBtn = getEBD("select-space-continue");
                const select = getEBD("select-space-option");

                const backBtn = getEBD("create-space-back");
                const createBtn = getEBD("create-space-create");
                const spaceName = getEBD("create-space-name");

                quitBtn.addEventListener('click', () => {window.parent.endTask('store')});

                const spacesDir = await ndutil.listDirectory(['appdata', 'store', 'spaces']);
                const spaces = [];

                const NXSPACE_SUFFIX = ".nxspace";

                spacesDir.forEach(function(space) {
                    if (space.endsWith(NXSPACE_SUFFIX)) {
                        spaces.push(space);
                    }
                });

                if (spaces.length === 0) {
                    const noSpacesOption = document.createElement('option');
                    noSpacesOption.textContent = "You have no spaces yet";
                    noSpacesOption.disabled = true;
                    select.appendChild(noSpacesOption);
                } else {
                    spaces.forEach(function(spaceNameWithSuffix) {
                        const option = document.createElement('option');

                        option.value = spaceNameWithSuffix;

                        option.textContent = spaceNameWithSuffix.slice(0, -NXSPACE_SUFFIX.length);

                        select.appendChild(option);
                    });
                }

                contBtn.addEventListener('click', function() {
                    if (select.value == "makeNew") {
                        tabs.change('create-space');
                    } else {
                        tabs.change('workspace');
                    }
                });

                backBtn.addEventListener('click', () => tabs.change('select-space'));
                createBtn.addEventListener('click', async function() {
                    await ndutil.createDirectory(['appdata', 'store', 'spaces', `${spaceName.value}.nxspace`]);
                    location.reload();
                });
            }
        }
    }
};