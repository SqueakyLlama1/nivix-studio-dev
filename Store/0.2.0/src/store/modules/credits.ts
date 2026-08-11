import { loadCSS } from "./file_loader.ts";
import * as tabs from './tabs.ts';

function getEBD(id: string) {return document.getElementById(id);}

let isInitialized: boolean = false;

const backBtn = getEBD('credits_back') as HTMLButtonElement;

export function init() {
    if (isInitialized) {
        tabs.goto('credits', { display: 'flex', logPrevious: true });
        return;
    }

    loadCSS('sheets/credits.css');

    backBtn.addEventListener('click', function() {
        tabs.goto('previous');
    });

    isInitialized = true;
    void tabs.goto('credits', { display: 'flex', logPrevious: true });
}
