import { loadCSS, unloadCSS } from './file_loader.ts';

import * as settings from './settings.ts';
import * as tabs from './tabs.ts';
import * as index from './index.ts';
import * as space_fillers from './space_fillers.ts';
import * as notifications from './notifications.ts';

import { electroview } from './index.ts';
import { populateSVGs } from "./file_loader.ts";

// Import all modules that listen for tabchange events, so electrobun can package them, and all top-level code is ran.

import './connect_database.ts';
import './create_space.ts';
import './credits.ts';
import './manage_spaces.ts';
import './select_space.ts';

function getEBD(id: string) {return document.getElementById(id);}
function wait(ms: number) {return new Promise(resolve => setTimeout(resolve, ms));}

const versionLabel = getEBD('load_footer_version');

let load_stylesheet: string;
let isFinishing = false;
let initialization: Promise<void> | null = null;

export function init(): Promise<void> {
    if (!initialization) {
        initialization = initialize().catch(error => {
            initialization = null;
            throw error;
        });
    }
    return initialization;
}

async function initialize() {
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
    
    await wait(menuDelay);
    await finish_loading();
}

async function finish_loading() {
    if (isFinishing) return;
    isFinishing = true;
    
    await tabs.remove('load_menu');
    unloadCSS(load_stylesheet);
    
    tabs.goto('select_space', { display: 'flex' });
}

export function checkLoadState() {
    if (document.readyState === 'complete') {
        void init();
    } else {
        window.addEventListener('load', () => void init(), { once: true });
    }
}
