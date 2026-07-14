const fs = require('fs').promises;
const path = require('path');
const { store_path } = require('./main.js');

const filePath = path.join(store_path, 'permissions.json');

let permissions = null; 

async function getPermissions() {
    if (permissions === null) {
        try {
            const permissionsFile = await fs.readFile(filePath, { encoding: 'utf-8' });
            permissions = JSON.parse(permissionsFile);
        } catch (error) {
            permissions = {}; 
        }
    }
    return permissions;
}

async function setPermission(permission, value = false) {
    if (!permission) throw new Error(`No Permission Defined`);

    const currentPermissions = await getPermissions(); 
    currentPermissions[permission] = value;
    
    await fs.writeFile(filePath, JSON.stringify(currentPermissions, null, 2));
}

async function setPermissions(permissionsList = []) {
    for (const item of permissionsList) {
        if (typeof item !== 'object' || item === null) continue;
        
        if (item.name) {
            await setPermission(item.name, item.value);
        }
    }
}

module.exports = {
    getPermissions,
    setPermission,
    setPermissions
};