import { quit } from './index.js'
import * as tabs from './tabs.js'

function getEBD(id) {return document.getElementById(id)};

export function init() {
    const newProjectBtn = getEBD('dashboard-getstarted-new');
    const addProjectBtn = getEBD('dashboard-getstarted-import');
    const settingsBtn = getEBD('dashboard-getstarted-settings');
    const quitBtn = getEBD('dashboard-getstarted-quit');

    newProjectBtn.addEventListener('click', function() { tabs.goto('newProject1'); });
    quitBtn.addEventListener('click', quit);
}