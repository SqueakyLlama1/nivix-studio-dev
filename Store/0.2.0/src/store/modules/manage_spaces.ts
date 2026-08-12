import { loadCSS } from "./file_loader.ts";

import * as tabs from './tabs.ts';
import * as create_space from './create_space.ts';

import { electroview } from "./index.ts";
import { type Space } from "../../shared/bun/store_types.ts";

function getEBD(id: string) {return document.getElementById(id);}

let isInitialized: boolean = false;

const backBtn = getEBD('manage_spaces_back') as HTMLButtonElement;
const createBtn = getEBD('manage_spaces_create') as HTMLButtonElement;

export function init() {
    if (isInitialized) {
        tabs.goto('manage_spaces', { logPrevious: true });
        return;
    }

    loadCSS('sheets/manage_spaces.css');

    backBtn.addEventListener('click', function() {
        tabs.goto('previous');
    });

    createBtn.addEventListener('click', function() {
        create_space.init();
    });

    isInitialized = true;
    void tabs.goto('manage_spaces', { logPrevious: true });
}

async function populate_spaces_list() {
    const spaces = await electroview.rpc!.request.listSpaces();
    spaces.forEach(function(space: Space) {

    });
}

function create_item() {

}