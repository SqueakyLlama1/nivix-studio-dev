import { loadCSS } from './file_loader.ts';
import * as tabs from './tabs.ts';
import * as select_space from './select_space.ts';
import { electroview } from './index.ts';

function getEBD(id: string) {return document.getElementById(id);}
function wait(ms: number) {return new Promise(resolve => setTimeout(resolve, ms));}

let isInitialized: boolean = false;

export async function init() {
    if (isInitialized) {
        await tabs.goto('create_space', {display: 'flex'});
        return;
    }
    loadCSS('sheets/create_space.css');

    isInitialized = true;
    await tabs.goto('create_space', { display: 'flex' });
}

const nameInput = getEBD('create_space_name') as HTMLInputElement;
const continueBtn = getEBD('create_space_continue') as HTMLButtonElement;
const cancelBtn = getEBD('create_space_cancel') as HTMLButtonElement;
const errorOutput = getEBD('create_space_output') as HTMLSpanElement;

continueBtn.addEventListener('click', async () => {
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
        await select_space.init();
        await wait(200);
        errorOutput.innerText = '';
        nameInput.value = '';
    } catch (err) {
        errorOutput.innerText = `Failed to Create Space: ${err}`;
	} finally {
		continueBtn.disabled = false;
    }
});

cancelBtn.addEventListener('click', () => select_space.init());
