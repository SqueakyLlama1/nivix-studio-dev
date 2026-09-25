import { loadCSS } from './file_loader';
import { preferences, setPreference } from './settings';
import { fillSpaceContainer } from './space_fillers';
import { gotoWorkspace } from './workspace';

import * as tabs from './tabs';

import { store, electroview } from './index';
import { type Space, type TabChangeEventDetail } from '../../shared/bun/store_types';

function getEBD(id: string) {return document.getElementById(id)}

const versionLabel = getEBD('selectSpace_footer_version') as HTMLSpanElement;
const shapeAnimToggle = getEBD('selectSpace_shapeAnimToggle') as HTMLInputElement;

let isInitialized: boolean = false;
let populateRequest = 0;

const settingsBtn = getEBD('selectSpace_settings') as HTMLButtonElement;
const manageBtn = getEBD('selectSpace_manage') as HTMLButtonElement;
const closeBtn = getEBD('selectSpace_quit') as HTMLButtonElement;
const refreshBtn = getEBD('selectSpace_refresh') as HTMLButtonElement;

const connectRemoteServerBtn = getEBD('selectSpace_connectDatabase') as HTMLButtonElement;
const exposeRemoteInterfaceBtn = getEBD('selectSpace_start_interface') as HTMLButtonElement;
const issuesBtn = getEBD('selectSpace_issues') as HTMLButtonElement;

const sourceCodeBtn = getEBD('selectSpace_source') as HTMLButtonElement;
const creditsBtn = getEBD('selectSpace_credits') as HTMLButtonElement;

const choiceSelection = getEBD('selectSpace_option') as HTMLSelectElement;
const continueBtn = getEBD('selectSpace_continue') as HTMLButtonElement;

export async function init() {
    if (isInitialized) return;
    
    loadCSS('sheets/selectSpace.css');

    manageBtn.addEventListener('click', function() {
        tabs.goto('manageSpaces', { display: 'flex' });
    });

    connectRemoteServerBtn.addEventListener('click', function() {
        tabs.goto('connectDatabase', { display: 'flex' });
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
        tabs.goto('createSpace');
    } else {
        gotoWorkspace(Number(choiceSelection.value));
    }
});

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'selectSpace') {
        init();
        populate_spaces_prompt();
    }
});