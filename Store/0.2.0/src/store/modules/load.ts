import { loadCSS, unloadCSS } from './file_loader.ts';

import * as settings from './settings.ts';
import * as tabs from './tabs.ts';
import * as index from './index.ts';
import * as welcome_back from './welcome_back.ts';
import * as select_space from './select_space.ts';
import * as space_fillers from './space_fillers.ts';
import * as notifications from './notifications.ts';

import { electroview } from './index.ts';
import { populateSVGs } from "./file_loader.ts";

function getEBD(id: string) {return document.getElementById(id);}
function wait(ms: number) {return new Promise(resolve => setTimeout(resolve, ms));}

const versionLabel = getEBD('load_footer_version');

let load_stylesheet: string;
let isFinishing = false;

export async function init() {
    versionLabel!.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    load_stylesheet = loadCSS('sheets/load.css');
    loadCSS('sheets/tooltips.css');
    
    let menuDelay: number = 750;
    
    try {
        notifications.init();
    } catch (err) {
        const message = err as string;
        console.warn(`Failed to load notifications module: ${message}`);
    }
    
    // Load User Preferences
    try {
        await settings.init();
        menuDelay = settings.preferences['menuDelay'] ?? 750;
    } catch (err) {
        const message = err as string;
        notifications.show_notification(`Non-Critical Error: Failed to load user preferences: ${message}`, 'warning');
    }
    
    // Replace SVG Placeholders with SVGs
    try {
        await populateSVGs((path) => electroview.rpc!.request.readFile({ path }));
    } catch {
        try {
            await populateSVGs();
        } catch (err) {
            const message = err as string;
            notifications?.show_notification(`Non-Critical Error: Failed to replace icon placeholders: ${message}`, 'warning');
        }
    }
    
    // Attempt to bind tab-navigation fix.
    try {
        document.addEventListener('keydown', (event: KeyboardEvent): void => {
            if (event.key !== 'Tab') return;
            
            const selector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
            const focusables = Array.from(
                document.querySelectorAll<HTMLElement>(selector)
            ).filter((el: HTMLElement) => {
                const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
                const isNotDisabled = !el.hasAttribute('disabled');
                return isVisible && isNotDisabled;
            });
            
            if (focusables.length === 0) return;
            
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];
            const activeElement = document.activeElement as HTMLElement | null;
            
            if (event.shiftKey && activeElement === firstEl) {
                lastEl.focus();
                event.preventDefault();
            } else if (!event.shiftKey && activeElement === lastEl) {
                firstEl.focus();
                event.preventDefault();
            }
        });
    } catch (err) {
        const message = err as string;
        notifications?.show_notification(`Non-Critical Error: Failed to load keyboard navigation fix: ${message}`, 'warning');
    }
    
    // Initialize space filler shapes
    try {
        space_fillers.init();
    } catch (err) {
        const message = err as string;
        notifications?.show_notification(`Non-Critical Error: Failed to load space filler shapes: ${message}`, 'warning');
    }

    // Set initial database to local SQLite
    try {
        electroview.rpc!.request.setDatabase({ database: 'sqlite' });
    } catch (err) {
        const message = err as string;
        notifications.show_notification(`Critical Error: Failed to initialize database, app loading will no longer progress. ${message}`);
    }
    
    await wait(menuDelay);
    await finish_loading();
}

async function finish_loading() {
    if (isFinishing) return;
    isFinishing = true;
    
    await tabs.remove('load_menu');
    unloadCSS(load_stylesheet);
    
    const versionToConvert = await electroview.rpc?.request.needsConversion();
    if (versionToConvert) {
        console.log('Old inventory found, showing welcome back screen');
        welcome_back.init();
        return;
    }
    select_space.init();
}

export function checkLoadState() {
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
}