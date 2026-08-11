import { loadCSS } from './file_loader.ts';
import { preferences, setPreference } from './settings.ts';

import * as tabs from './tabs.ts';
import * as index from './index.ts';
import * as create_space from './create_space.ts';
import * as connect_database from './connect_database.ts';
import * as manage_spaces from './manage_spaces.ts';
import * as credits from './credits.ts';

import { electroview } from './index.ts';
import { type Space } from '../../shared/bun/store_types.ts';

function getEBD(id: string) {return document.getElementById(id);}

const versionLabel = getEBD('select_space_footer_version') as HTMLSpanElement;
const shapeAnimToggle = getEBD('select_space_shapeAnimToggle') as HTMLInputElement;

let isInitialized: boolean = false;
let populateRequest = 0;

const connectRemoteServerBtn = getEBD('select_space_connect_database') as HTMLButtonElement;
const exposeRemoteServerBtn = getEBD('select_space_start_server') as HTMLButtonElement;
const changelogBtn = getEBD('select_space_changelog') as HTMLButtonElement;
const creditsBtn = getEBD('select_space_credits') as HTMLButtonElement;
const sourceCodeBtn = getEBD('select_space_source') as HTMLButtonElement;
const issuesBtn = getEBD('select_space_issues') as HTMLButtonElement;
const websiteBtn = getEBD('select_space_webpage') as HTMLButtonElement;
const closeBtn = getEBD('select_space_quit') as HTMLButtonElement;
const refreshBtn = getEBD('select_space_refresh') as HTMLButtonElement;
const manageBtn = getEBD('select_space_manage') as HTMLButtonElement;

const choiceSelection = getEBD('select_space_option') as HTMLSelectElement;
const continueBtn = getEBD('select_space_continue') as HTMLButtonElement;

export async function init(tutorial?: boolean) {
    if (isInitialized) {
        await populate_spaces_prompt();
        tabs.goto('select_space', {display: 'flex'});
        return;
    }
    
    loadCSS('sheets/select_space.css');

    manageBtn.addEventListener('click', manage_spaces.init);
    connectRemoteServerBtn.addEventListener('click', connect_database.init);
    creditsBtn.addEventListener('click', credits.init);
    refreshBtn.addEventListener('click', populate_spaces_prompt);
    
    sourceCodeBtn.addEventListener('click', function() {
        window.open('https://github.com/SqueakyLlama1/nivix-studio-dev/tree/main/Store/0.2.0', '_blank');
    });

    issuesBtn.addEventListener('click', function() {
        window.open('https://github.com/SqueakyLlama1/nivix-studio-dev/issues', '_blank');
    });
    
    websiteBtn.addEventListener('click', function() {
        window.open('https://nivixtech.com/studio', '_blank');
    });
    
    closeBtn.addEventListener('click', function() {
        electroview.rpc?.send.closeStore();
    });
    
    versionLabel.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    shapeAnimToggle.addEventListener('change', toggleShapeAnimations);
    shapeAnimToggle.checked = preferences['disableShapeAnimations'];
    
    toggleShapeAnimations();
    
    isInitialized = true;
    try {
        await populate_spaces_prompt();
    } catch (error) {
        console.error('Failed to populate spaces:', error);
    }
    await tabs.goto('select_space', { display: 'flex' });
}

function toggleShapeAnimations() {
    const shapes = document.querySelectorAll<HTMLElement>('.space_filler_shape');
    shapes.forEach(function(shape) {
        shape.style.animationPlayState = shapeAnimToggle.checked ? 'paused' : 'running';
    });
    void setPreference('disableShapeAnimations', shapeAnimToggle.checked).catch(error => {
        console.error('Failed to save animation preference:', error);
    });
}

export async function populate_spaces_prompt() {
    const request = ++populateRequest;
    const spaces = await electroview.rpc?.request.listSpaces() ?? [];
	// Do not let an older response overwrite a newer refresh or database switch.
    if (request !== populateRequest) return;
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
        void create_space.init();
    }
});
