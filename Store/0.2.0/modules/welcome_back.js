import { loadCSS } from './file_loader.js';
import * as tabs from './tabs.js';
import * as main from './index.js';
import * as changelog from './changelog.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const quitBtn = getEBD('welcome_back_quit');
const changelogBtn = getEBD('welcome_back_changelog');
const convertBtn = getEBD('welcome_back_convert');

let welcomeback_stylesheet;

export async function init() {
    welcomeback_stylesheet = loadCSS('sheets/welcome_back.css');

    quitBtn.addEventListener('click', main.quit);
    changelogBtn.addEventListener('click', changelog.init);

    tabs.show('welcome_back');
}