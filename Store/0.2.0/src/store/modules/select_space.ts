import { loadCSS } from './file_loader.ts';
import { preferences, setPreference } from './settings.ts';
import { fillSpaceContainer } from './space_fillers.ts';

import * as tabs from './tabs.ts';

import { store, electroview } from './index.ts';
import { type Space, type TabChangeEventDetail } from '../../shared/bun/store_types.ts';

function getEBD(id: string) {return document.getElementById(id)}

const versionLabel = getEBD('select_space_footer_version') as HTMLSpanElement;
const shapeAnimToggle = getEBD('select_space_shapeAnimToggle') as HTMLInputElement;

let isInitialized: boolean = false;
let populateRequest = 0;

const connectRemoteServerBtn = getEBD('select_space_connect_database') as HTMLButtonElement;
const exposeRemoteInterfaceBtn = getEBD('select_space_start_interface') as HTMLButtonElement;
const creditsBtn = getEBD('select_space_credits') as HTMLButtonElement;
const sourceCodeBtn = getEBD('select_space_source') as HTMLButtonElement;
const issuesBtn = getEBD('select_space_issues') as HTMLButtonElement;
const websiteBtn = getEBD('select_space_webpage') as HTMLButtonElement;
const closeBtn = getEBD('select_space_quit') as HTMLButtonElement;
const refreshBtn = getEBD('select_space_refresh') as HTMLButtonElement;
const manageBtn = getEBD('select_space_manage') as HTMLButtonElement;

const choiceSelection = getEBD('select_space_option') as HTMLSelectElement;
const continueBtn = getEBD('select_space_continue') as HTMLButtonElement;

export async function init() {
    if (isInitialized) return;
    
    loadCSS('sheets/select_space.css');

    manageBtn.addEventListener('click', function() {
        tabs.goto('manage_spaces');
    });

    connectRemoteServerBtn.addEventListener('click', function() {
        tabs.goto('connect_database');
    });

    creditsBtn.addEventListener('click', function() {
        tabs.goto('credits');
    });

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
    
    versionLabel.innerText = `v${store.sessionVersion}` || "Failed to get session version";
    
    shapeAnimToggle.addEventListener('change', toggleShapeAnimations);
    shapeAnimToggle.checked = preferences['disableShapeAnimations'];
    
    toggleShapeAnimations();
    
    isInitialized = true;
}

function toggleShapeAnimations() {
    void setPreference('disableShapeAnimations', shapeAnimToggle.checked).catch(error => {
        console.error('Failed to save animation preference:', error);
    });
    fillSpaceContainer();
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
        tabs.goto('create_space');
    }
});

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'select_space') {
        init();
        populate_spaces_prompt();
    }
});