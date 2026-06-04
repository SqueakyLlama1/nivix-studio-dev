import * as tabs from './tabs.js'

function getEBD(id) { return document.getElementById(id); }

export function init() {
    bindCommonControls();
}

function bindCommonControls() {
    const add = getEBD('workspace-common-add');
    const settings = getEBD('workspace-common-settings');
    const quit = getEBD('workspace-common-quit');
    const query = getEBD('workspace-common-query');
    const clipboard = getEBD('workspace-common-clipboard');

    query.addEventListener('click', () => {tabs.goto('workspace-query')});
}