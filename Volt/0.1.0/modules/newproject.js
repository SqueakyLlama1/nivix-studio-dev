import * as tabs from './tabs.js'

function getEBD(id) {return document.getElementById(id)};

export function init() {
    const cancelBtn = getEBD('newProject1-cancel');

    cancelBtn.addEventListener('click', function() { tabs.goto("dashboard"); });
}