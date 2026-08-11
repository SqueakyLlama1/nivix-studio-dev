import { loadCSS, unloadCSS } from './file_loader.ts';
import * as tabs from './tabs.ts';
import * as main from './index.ts';
import * as changelog from './changelog.ts';
import * as select_space from './select_space.ts';

function getEBD(id: string) {return document.getElementById(id);}

const quitBtn = getEBD('welcome_back_quit') as HTMLButtonElement;
const skipBtn = getEBD('welcome_back_skip') as HTMLButtonElement;
const continueBtn = getEBD('welcome_back_continue') as HTMLButtonElement;

let welcomeback_stylesheet;
let isInitialized = false;

export async function init() {
    if (isInitialized) {
        await tabs.goto('welcome_back');
        return;
    }
    welcomeback_stylesheet = loadCSS('sheets/welcome_back.css');

    quitBtn.addEventListener('click', main.quit);
    skipBtn.addEventListener('click', () => { select_space.init(); });
    continueBtn.addEventListener('click', () => {select_space.init(true)});

    isInitialized = true;
    await tabs.goto('welcome_back');
}
