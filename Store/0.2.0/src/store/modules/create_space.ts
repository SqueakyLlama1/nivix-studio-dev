import { loadCSS } from './file_loader';
import * as tabs from './tabs';
import * as select_space from './select_space';

import { electroview } from './index';
import type { TabChangeEventDetail } from '../../shared/bun/store_types';

function getEBD(id: string) {return document.getElementById(id)}
function wait(ms: number) {return new Promise((resolve) => { setTimeout(resolve, ms)})}

let isInitialized: boolean = false;

const nameInput = getEBD('create_space_name') as HTMLInputElement;
const continueBtn = getEBD('create_space_continue') as HTMLButtonElement;
const cancelBtn = getEBD('create_space_cancel') as HTMLButtonElement;
const errorOutput = getEBD('create_space_output') as HTMLSpanElement;

export async function init() {
    if (isInitialized) return;
    loadCSS('sheets/create_space.css');
    
    continueBtn.addEventListener('click', async function() {
        if (continueBtn.disabled) return;
        if (!nameInput.value || !nameInput.value.trim() || nameInput.value.trim() === '') {
            errorOutput.innerText = `Space Name Cannot Be Empty`;
            return;
        };
        console.log(`Creating New Space: ${nameInput.value}`);
        try {
            continueBtn.disabled = true;
            await electroview.rpc?.request.createSpace(nameInput.value);
            if (nameInput.value.toLowerCase().trim() === 'empty' && errorOutput.innerText === 'Space Name Cannot Be Empty') {
                errorOutput.innerText = 'Haha. Very Funny';
                await wait(500);
            }
            await select_space.populate_spaces_prompt();
            tabs.goto('previous');
            await wait(tabs.programaticAnimationDuration);
            errorOutput.innerText = '';
            nameInput.value = '';
        } catch (err) {
            errorOutput.innerText = `Failed to Create Space: ${err}`;
        } finally {
            continueBtn.disabled = false;
        }
    });
    
    cancelBtn.addEventListener('click', function() {
        tabs.goto('previous');
    });
    
    isInitialized = true;
}

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'create_space') init();
});