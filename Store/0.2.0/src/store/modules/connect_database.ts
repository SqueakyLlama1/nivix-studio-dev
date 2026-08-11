import { loadCSS } from "./file_loader.ts";
import * as tabs from './tabs.ts';

function getEBD(id: string) {return document.getElementById(id);}

let isInitialized: boolean = false;

const backBtn = getEBD('connect_database_back') as HTMLButtonElement;

export function init() {
    if (!isInitialized) {
        backBtn.addEventListener('click', function() {
            tabs.goto('previous');
        });
        
        loadCSS('sheets/connect_database.css');
        isInitialized = true;
        init();
    } else {
        tabs.goto('connect_database', { logPrevious: true });
    }
}