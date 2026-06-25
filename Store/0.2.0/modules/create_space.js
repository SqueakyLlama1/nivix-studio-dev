import { loadCSS } from './file_loader.js';
import * as tabs from './tabs.js';
import * as select_space from './select_space.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

let isInitialized = false;
let create_space_stylesheet;

export async function init() {
    if (isInitialized) {
        tabs.goto('create_space', {display: 'flex'});
        return;
    }
    create_space_stylesheet = loadCSS('sheets/create_space.css');

    isInitialized = true;
    init();
}

const nameInput = getEBD('create_space_name');
const continueBtn = getEBD('create_space_continue');
const cancelBtn = getEBD('create_space_cancel');
const errorOutput = getEBD('create_space_output');

continueBtn.addEventListener('click', async () => {
    if (!nameInput.value || !nameInput.value.trim() || nameInput.value.trim() === '') {
        errorOutput.innerText = `Space Name Cannot Be Empty`;
        return;
    };
    console.log(`Creating New Space: ${nameInput.value}`);
    try {
        await window.storeAPI.createSpace(nameInput.value);
        if (nameInput.value.toLowerCase().trim() === 'empty' && errorOutput.innerText === 'Space Name Cannot Be Empty') {
            errorOutput.innerText = 'Haha. Very Funny';
            await wait(500);
        }
        select_space.init();
        await wait(200);
        errorOutput.innerText = '';
        nameInput.value = '';
    } catch (err) {
        errorOutput.innerText = `Failed to Create Space: ${err}`;
    }
});

cancelBtn.addEventListener('click', select_space.init);