import { loadCSS } from "./file_loader.ts";
import * as tabs from './tabs.ts';

function getEBD(id: string) {return document.getElementById(id);}

let isInitialized: boolean = false;

const backBtn = getEBD('manage_spaces_back') as HTMLButtonElement;

export function init() {
    if (isInitialized) {
        tabs.goto('manage_spaces', { logPrevious: true });
        return;
    }

    loadCSS('sheets/manage_spaces.css');

    backBtn.addEventListener('click', function() {
        tabs.goto('previous');
    });

    isInitialized = true;
    void tabs.goto('manage_spaces', { logPrevious: true });
}
