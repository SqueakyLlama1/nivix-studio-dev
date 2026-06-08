import { loadCSS, unloadCSS } from './file_loader.js';
import * as settings from './settings.js';
import * as tabs from './tabs.js';
import * as index from './index.js';
import * as welcome_back from './welcome_back.js';
import * as select_space from './select_space.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const load_menu = getEBD('load_menu');

const versionLabel = getEBD('load_footer_version');

let load_stylesheet;
let tooltip_stylesheet;

let isFinishing = false;

export async function init() {
    versionLabel.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    load_stylesheet = loadCSS('sheets/load.css');
    tooltip_stylesheet = loadCSS('sheets/tooltips.css');
    
    let menuDelay;

    try {
        await window.storeAPI.initSandbox();
        console.log('Initialized Sandbox');
    } catch (err) {
        // Add a critical error here
        console.error(`Failed to initialize sandbox: ${err}`);
        return;
    }
    try {
        await settings.init();
        menuDelay = settings.preferences.menuDelay ?? 750;
    } catch (err) {
        // Add a soft error here
    }
    await wait(menuDelay);
    await finish_loading();
}

async function finish_loading() {
    if (isFinishing) return;
    isFinishing = true;
    
    await tabs.remove('load_menu');
    unloadCSS(load_stylesheet);

    const versionToConvert = await window.storeAPI.needsConversion();
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