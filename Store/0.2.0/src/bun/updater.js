import { Updater } from "electrobun/bun";
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const studio_path = path.join(os.homedir(), 'nvxstdo');
const store_path = path.join(studio_path, 'store');
const skippedVersionFilePath = path.join(store_path, 'skippedVersion.txt');

let updateInfo = null;
let skippedVersion = null;

export async function init() {
    if (!Updater || typeof Updater.checkForUpdate !== 'function') {
        throw new Error('Updater is not available in this environment');
    }

    try {
        skippedVersion = await fs.readFile(skippedVersionFilePath, { encoding: 'utf-8' });
    } catch (err) {
        // File doesn't exist yet
        skippedVersion = null;
    }

    updateInfo = await Updater.checkForUpdate();
}

export async function updateAvailable() {
    // Guard against init() not being called properly
    if (!updateInfo) {
        return false; 
    }

    try {
        if (skippedVersion === updateInfo.version) return false;
        if (updateInfo.updateAvailable) {
            return updateInfo?.version || false;
        }
        return false;
    } catch (err) {
        throw new Error(`Update check failed: ${err.message}`);
    }
}

export async function update(onProgress) {
    await Updater.downloadUpdate((progress) => {
        console.log(`Module downloaded: ${progress.percent}%`);
        
        if (typeof onProgress === 'function') {
            onProgress(progress.percent);
        }
    });
}

export async function restart() {
    Updater.applyUpdateAndRestart();
}

export async function skipVersion() {
    const skippedVersion = updateInfo?.version;
    try {
        await fs.writeFile(skippedVersionFilePath, skippedVersion || '', { encoding: 'utf-8' });
    } catch (err) {
        console.error(`Failed to save skipped version: ${err.message}`);
    }
}