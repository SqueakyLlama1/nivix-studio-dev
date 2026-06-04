import { loadCSS, unloadCSS } from './file_loader.js';
import { visualSettings } from './settings.js';
import * as tabs from './tabs.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const menuDelay = visualSettings.menuDelay || 50;
const load_menu = getEBD('load_menu');
let load_stylesheet;

let isFinishing = false;

export function init() {
    load_stylesheet = loadCSS('sheets/load.css');
}

async function finish_loading() {
    if (isFinishing) return;
    isFinishing = true;
    
    await tabs.remove('load_menu');
    unloadCSS(load_stylesheet);
}

window.addEventListener('load', async () => {
    await wait(menuDelay);
    // await finish_loading();
});