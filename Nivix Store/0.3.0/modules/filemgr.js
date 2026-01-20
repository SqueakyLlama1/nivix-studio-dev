const files = {
    header: "[FILES] ",
    async convert() {
        const h = files.header;
        const ndutil = window.parent.ndutil;
        console.log(`${h}Convert called`);

        const OIP = ['appdata', 'store', 'inventory.ndjson'];
        const NIP = ['appdata', 'store', 'inventory.old.nxgroup'];

        const NIPExists = await ndutil.fileExists(NIP);
        const OIPExists = await ndutil.fileExists(OIP);

        if (NIPExists && OIPExists) {
            console.log(`${h}Finishing previously failed conversion`);
            await ndutil.deleteFile(NIP);
        }

        if (await ndutil.fileExists(OIP)) {
            console.log(`${h}Copying old inventory...`);
            try {
                await ndutil.copyFile(OIP, NIP);

                await ndutil.deleteFile(OIP);

                console.log(`${h}Converted 0.1.0 inventory to ${NIP.join('/')}`);
                return;
            } catch(err) {
                console.error(`${h}Failed to convert 0.1.0 inventory: ${err}`);
                throw err;
            }
        }
        console.log(`${h}Convert End`)
    },

    async init() {
        try {
            const ndutil = window.parent.ndutil;
            if (!await ndutil.fileExists(['appdata', 'store'])) {
                await ndutil.createDirectory(['appdata', 'store']);
            } if (!await ndutil.fileExists(['appdata', 'store', 'spaces'])) {
                await ndutil.createDirectory(['appdata', 'store', 'spaces']);
            }
        } catch(err) {
            console.error(`${files.header}Failed to create app data directory: ${err}`);
            throw err;
        }

        await this.convert();
    }
};