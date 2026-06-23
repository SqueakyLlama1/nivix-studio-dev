import { loadCSS } from './file_loader.js';
import { preferences, setPreference } from './settings.js';
import * as tabs from './tabs.js';
import * as index from './index.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const versionLabel = getEBD('select_space_footer_version');
const shapeAnimToggle = getEBD('select_space_shapeAnimToggle');

let select_space_stylesheet;
let isInitialized = false;

export async function init(tutorial = false) {
    if (isInitialized) {
        tabs.goto('select_space', {display: 'flex'});
        return;
    }
    
    select_space_stylesheet = loadCSS('sheets/select_space.css');
    
    versionLabel.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    shapeAnimToggle.addEventListener('change', toggleShapeAnimations);
    shapeAnimToggle.checked = preferences.disableShapeAnimations;

    toggleShapeAnimations();
    
    isInitialized = true;
    init();
}

function toggleShapeAnimations() {
    const shapes = document.querySelectorAll('.space_filler_shape');
    shapes.forEach(function(shape) {
        shape.style.animationPlayState = shapeAnimToggle.checked ? 'paused' : 'running';
    });
    setPreference('disableShapeAnimations', shapeAnimToggle.checked);
}

// Misc. Button Binding

const connectRemoteServerBtn = getEBD('select_space_connect_server');
const exposeRemoteServerBtn = getEBD('select_space_start_server');
const changelogBtn = getEBD('select_space_changelog');
const creditsBtn = getEBD('select_space_credits');
const sourceCodeBtn = getEBD('select_space_source');
const websiteBtn = getEBD('select_space_studio_webpage');
const closeBtn = getEBD('select_space_quit');

sourceCodeBtn.addEventListener('click', function() {
    window.open('https://github.com/SqueakyLlama1/nivix-studio-dev/tree/80bd329bfbdadc1fc31958cce9e92e8885adf4f8/Store/0.2.0', '_blank');
});

websiteBtn.addEventListener('click', function() {
    window.open('https://nivixtech.com/studio', '_blank');
});

closeBtn.addEventListener('click', function() {
    window.close();
});