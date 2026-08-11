import { Updater } from "electrobun/bun";
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const studio_path = path.join(os.homedir(), 'nvxstdo');
const store_path = path.join(studio_path, 'store');
const skippedVersionFilePath = path.join(store_path, 'skippedVersion.txt');

let updateInfo: any = null;
let skippedVersion: string | null = null;

export async function init() {
    try {
        await fs.mkdir(store_path, { recursive: true });
    } catch {
        // Ignore if directory already exists
    }

    try {
        skippedVersion = await fs.readFile(skippedVersionFilePath, { encoding: 'utf-8' });
    } catch (err) {
        skippedVersion = null;
    }

    if (!Updater || typeof Updater.checkForUpdate !== 'function') {
        console.warn('Updater module is not available in this environment');
        updateInfo = { updateAvailable: false };
        return;
    }

    try {
        updateInfo = await Updater.checkForUpdate();
    } catch (err: any) {
        console.error('Failed to check for updates:', err?.message || err);
        updateInfo = { updateAvailable: false };
    }
}

export async function updateAvailable() {
    if (!updateInfo) {
        return false; 
    }

    try {
        if (skippedVersion && skippedVersion.trim() === updateInfo?.version) {
            return false;
        }
        
        if (updateInfo?.updateAvailable) {
            return updateInfo?.version || false;
        }
        
        return false;
    } catch (err: any) {
        console.error(`Update check calculation failed: ${err?.message}`);
        return false;
    }
}

export async function update() {
    if (!Updater?.downloadUpdate) return;
    await Updater.downloadUpdate();
}

export async function restart() {
    if (Updater?.applyUpdate) {
        Updater.applyUpdate();
    }
}

export async function skipVersion() {
    const versionToSkip = updateInfo?.version;
    if (!versionToSkip) return;

    try {
        await fs.mkdir(store_path, { recursive: true });
        await fs.writeFile(skippedVersionFilePath, versionToSkip.trim(), { encoding: 'utf-8' });
        skippedVersion = versionToSkip;
    } catch (err: any) {
        console.error(`Failed to save skipped version: ${err?.message}`);
    }
}