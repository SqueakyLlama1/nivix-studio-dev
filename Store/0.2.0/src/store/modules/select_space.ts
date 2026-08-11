import { loadCSS } from './file_loader.ts';
import { preferences, setPreference } from './settings.ts';
import * as tabs from './tabs.ts';
import * as index from './index.ts';
import * as create_space from './create_space.ts';
import * as connect_database from './connect_database.ts';
import { electroview } from './index.ts';
import { type Space } from '../../shared/bun/store_types.ts';

function getEBD(id: string) {return document.getElementById(id);}

const versionLabel = getEBD('select_space_footer_version') as HTMLSpanElement;
const shapeAnimToggle = getEBD('select_space_shapeAnimToggle') as HTMLInputElement;

let isInitialized: boolean = false;

export async function init(tutorial?: boolean) {
    if (isInitialized) {
        await populate_spaces_prompt();
        tabs.goto('select_space', {display: 'flex'});
        return;
    }
    
    loadCSS('sheets/select_space.css');
    
    versionLabel.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    shapeAnimToggle.addEventListener('change', toggleShapeAnimations);
    shapeAnimToggle.checked = preferences['disableShapeAnimations'];

    toggleShapeAnimations();
    
    isInitialized = true;
    init();
}

function toggleShapeAnimations() {
    const shapes = document.querySelectorAll<HTMLElement>('.space_filler_shape');
    shapes.forEach(function(shape) {
        shape.style.animationPlayState = shapeAnimToggle.checked ? 'paused' : 'running';
    });
    setPreference('disableShapeAnimations', shapeAnimToggle.checked);
}

// Miscellaneous Button Binding

const connectRemoteServerBtn = getEBD('select_space_connect_database') as HTMLButtonElement;
const exposeRemoteServerBtn = getEBD('select_space_start_server') as HTMLButtonElement;
const changelogBtn = getEBD('select_space_changelog') as HTMLButtonElement;
const creditsBtn = getEBD('select_space_credits') as HTMLButtonElement;
const sourceCodeBtn = getEBD('select_space_source') as HTMLButtonElement;
const websiteBtn = getEBD('select_space_studio_webpage') as HTMLButtonElement;
const closeBtn = getEBD('select_space_quit') as HTMLButtonElement;

connectRemoteServerBtn.addEventListener('click', function() {
    connect_database.init();
});

sourceCodeBtn.addEventListener('click', function() {
    window.open('https://github.com/SqueakyLlama1/nivix-studio-dev/tree/main/Store/0.2.0', '_blank');
});

websiteBtn.addEventListener('click', function() {
    window.open('https://nivixtech.com/studio', '_blank');
});

closeBtn.addEventListener('click', () => {
    electroview.rpc?.send.closeStore();
});

// Space Selection System

const choiceSelection = getEBD('select_space_option') as HTMLSelectElement;
const continueBtn = getEBD('select_space_continue') as HTMLButtonElement;

async function populate_spaces_prompt() {
    const spaces = await electroview.rpc?.request.listSpaces();
    choiceSelection.replaceChildren();

    const createSpaceOption = new Option("Create a New Space", 'create-new-space');
    choiceSelection.add(createSpaceOption);
    choiceSelection.value = 'create-new-space';

    if (!spaces.length) {
        const option = new Option("You don't have any spaces");
        option.disabled = true;
        choiceSelection.add(option);
        return;
    }

    spaces.forEach(function(space: Space) {
        const option = new Option(space.name, String(space.id));
        choiceSelection.add(option);
    });
}

continueBtn.addEventListener('click', function() {
    const selection = choiceSelection.value;
    if (selection === 'create-new-space') {
        create_space.init();
    }
});