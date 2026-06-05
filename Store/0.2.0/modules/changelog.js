import { loadCSS } from './file_loader.js';
import * as tabs from './tabs.js';
import * as main from './index.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const backBtn = getEBD('changelog_back');
const versionLabel = getEBD('changelog_version');

let changelog_stylesheet;
let isInitialized = false;

export async function init() {
    if (isInitialized) {
        tabs.goto('changelog');
        return;
    }
    
    backBtn.addEventListener('click', () => {tabs.goto('previous')});
    versionLabel.innerText = main.store.sessionVersion || 'Failed to get session version.';
    isInitialized = true;
    console.log('Initialized Changelog Menu');
    init();
}