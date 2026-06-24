import { loadCSS } from './file_loader.js';
import { preferences, setPreference } from './settings.js';
import * as tabs from './tabs.js';
import * as index from './index.js';
import * as create_space from './create_space.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const versionLabel = getEBD('select_space_footer_version');
const shapeAnimToggle = getEBD('select_space_shapeAnimToggle');

let select_space_stylesheet;
let isInitialized = false;

export async function init(tutorial = false) {
    if (isInitialized) {
        await populate_spaces_prompt();
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

// Miscellaneous Button Binding

const connectRemoteServerBtn = getEBD('select_space_connect_server');
const exposeRemoteServerBtn = getEBD('select_space_start_server');
const changelogBtn = getEBD('select_space_changelog');
const creditsBtn = getEBD('select_space_credits');
const sourceCodeBtn = getEBD('select_space_source');
const websiteBtn = getEBD('select_space_studio_webpage');
const closeBtn = getEBD('select_space_quit');

sourceCodeBtn.addEventListener('click', function() {
    window.open('https://github.com/SqueakyLlama1/nivix-studio-dev/tree/main/Store/0.2.0', '_blank');
});

websiteBtn.addEventListener('click', function() {
    window.open('https://nivixtech.com/studio', '_blank');
});

closeBtn.addEventListener('click', window.close);

// Space Selection System

const choiceSelection = getEBD('select_space_option');
const continueBtn = getEBD('select_space_continue');

async function populate_spaces_prompt() {
    const spaces = await window.storeAPI.listSpaces();
    choiceSelection.replaceChildren();

    const createSpaceOption = new Option("Create a New Space", 'create-new-space');
    choiceSelection.add(createSpaceOption);
    choiceSelection.selected = 'create-new-space';

    if (!spaces.length) {
        const option = new Option("You don't have any spaces");
        option.disabled = true;
        choiceSelection.add(option);
        return;
    }

    spaces.forEach(function(space) {
        const option = new Option(space.name, space.id);
        choiceSelection.add(option);
    });
}

continueBtn.addEventListener('click', function() {
    const selection = choiceSelection.value;
    if (selection === 'create-new-space') {
        create_space.init();
    }
});