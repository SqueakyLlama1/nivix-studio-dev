import { quit } from './index.js';
import { loadCSS } from './file_loader.js';
import * as tabs from './tabs.js';
import * as template_selector from './template_selector.js';

function getEBD(id) {return document.getElementById(id)};

let dashboard_stylesheet;

export function init() {
    const newProjectBtn = getEBD('dashboard-getstarted-new');
    const addProjectBtn = getEBD('dashboard-getstarted-import');
    const settingsBtn = getEBD('dashboard-getstarted-settings');
    const quitBtn = getEBD('dashboard-getstarted-quit');

    newProjectBtn.addEventListener('click', function() { template_selector.init(); });
    quitBtn.addEventListener('click', quit);

    dashboard_stylesheet = loadCSS('sheets/dashboard.css');
    tabs.show('dashboard');
}