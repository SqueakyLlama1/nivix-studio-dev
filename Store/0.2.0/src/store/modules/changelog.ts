import { loadCSS } from './file_loader.ts';
import * as tabs from './tabs.ts';
import * as main from './index.ts';

function getEBD(id: string) {return document.getElementById(id);}

const backBtn = getEBD('changelog_back') as HTMLButtonElement;
const versionLabel = getEBD('changelog_version') as HTMLSpanElement;

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
    await tabs.goto('changelog', { logPrevious: true });
}
