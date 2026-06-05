import { loadCSS, unloadCSS } from './file_loader.js';
import * as tabs from './tabs.js';
import * as main from './index.js';
import * as changelog from './changelog.js';
import * as select_space from './select_space.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const quitBtn = getEBD('welcome_back_quit');
const skipBtn = getEBD('welcome_back_skip');
const continueBtn = getEBD('welcome_back_continue');

let welcomeback_stylesheet;

export async function init() {
    welcomeback_stylesheet = loadCSS('sheets/welcome_back.css');

    quitBtn.addEventListener('click', main.quit);
    skipBtn.addEventListener('click', select_space.init);
    continueBtn.addEventListener('click', () => {select_space.init(true)});

    tabs.show('welcome_back');
}