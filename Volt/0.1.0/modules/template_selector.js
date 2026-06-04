import * as tabs from './tabs.js';
import { loadCSS } from './file_loader.js';

function wait(ms) {return new Promise((resolve) => {setTimeout(resolve, ms)})};
function getEBD(id) {return document.getElementById(id)};

let new_project_stylesheet;

export async function init() {
    new_project_stylesheet = loadCSS('sheets/template_selector.css');
    tabs.goto('template_selector');
}