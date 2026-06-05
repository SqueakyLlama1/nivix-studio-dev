import { loadCSS } from './file_loader.js';
import { visualSettings } from './settings.js';
import * as tabs from './tabs.js';
import * as index from './index.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const versionLabel = getEBD('select_space_footer_version');

let select_space_stylesheet;
let isInitialized = false;

export async function init(tutorial = false) {
    if (isInitialized) {
        tabs.goto('select_space', {display: 'flex'});
        return;
    }

    select_space_stylesheet = loadCSS('sheets/select_space.css');

    versionLabel.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";

    isInitialized = true;
    init();
}