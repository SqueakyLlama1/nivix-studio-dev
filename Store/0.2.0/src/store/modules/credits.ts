import type { TabChangeEventDetail } from "../../shared/bun/store_types.ts";
import { loadCSS } from "./file_loader.ts";
import * as tabs from './tabs.ts';

function getEBD(id: string) {return document.getElementById(id)}

let isInitialized: boolean = false;

const backBtn = getEBD('credits_back') as HTMLButtonElement;

export function init() {
    if (isInitialized) return;

    loadCSS('sheets/credits.css');

    backBtn.addEventListener('click', function() {
        tabs.goto('previous');
    });

    isInitialized = true;
}

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'credits') init();
});