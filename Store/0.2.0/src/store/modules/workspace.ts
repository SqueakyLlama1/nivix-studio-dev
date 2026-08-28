import { loadCSS } from "./file_loader";

import * as tabs from './tabs';

import { electroview } from "./index";
import { type TabChangeEventDetail } from "../../shared/bun/store_types";

function getEBD<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let isInitialized = false;

export function init(): void {
    if (isInitialized) return;

    loadCSS('sheets/workspace.css');

    isInitialized = true;
}

export function gotoWorkspace(space: number) {
    tabs.goto('workspace', { display: 'flex' });
}

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'workspace') {
        init();
    }
});