import { loadCSS } from "./file_loader.ts";

import * as tabs from './tabs.ts';
import * as create_space from './create_space.ts';

import { electroview } from "./index.ts";
import { type Space, type TabChangeEventDetail } from "../../shared/bun/store_types.ts";

function getEBD(id: string) {return document.getElementById(id);}

let isInitialized: boolean = false;

const backBtn = getEBD('manage_spaces_back') as HTMLButtonElement;
const createBtn = getEBD('manage_spaces_create') as HTMLButtonElement;

export function init() {
    if (isInitialized) return;

    loadCSS('sheets/manage_spaces.css');

    backBtn.addEventListener('click', function() {
        tabs.goto('previous');
    });

    createBtn.addEventListener('click', function() {
        tabs.goto('create_space');
    });

    isInitialized = true;
}

async function populate_spaces_list() {
    const spaces = await electroview.rpc!.request.listSpaces();
    spaces.forEach(function(space: Space) {

    });
}

function create_item() {

}

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'manage_spaces') {
        init();
        populate_spaces_list();
    }
});