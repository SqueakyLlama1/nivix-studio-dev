import { loadCSS, unloadCSS } from './file_loader.ts';
import * as settings from './settings.ts';
import * as tabs from './tabs.ts';
import * as index from './index.ts';
import * as welcome_back from './welcome_back.ts';
import * as select_space from './select_space.ts';
import * as space_fillers from './space_fillers.ts';
import { electroview } from './index.ts';

function getEBD(id: string) {return document.getElementById(id);}
function wait(ms: number) {return new Promise(resolve => setTimeout(resolve, ms));}

const versionLabel = getEBD('load_footer_version');

let load_stylesheet: string;
let tooltip_stylesheet;

let isFinishing = false;

export async function init() {
    versionLabel!.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    load_stylesheet = loadCSS('sheets/load.css');
    tooltip_stylesheet = loadCSS('sheets/tooltips.css');
    
    let menuDelay: number = 750;
    
    try {
        await settings.init();
        menuDelay = settings.preferences['menuDelay'] ?? 750;
    } catch (err) {
        // Add a soft error here
    }
    space_fillers.init();
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