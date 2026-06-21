// Local Modules
import * as workspace from './workspace.js'
import * as fs from './fs.js'
import * as load from './load.js'
import * as selectspace from './selectspace.js'
import * as settings from './settings.js'

// UI Libraries
import * as tabs from './tabs.js'
import * as tooltipsLib from '../libraries/tooltips.js'

// Node Modules
const os = require('os');
const path = require('path');

// Helper Functions
function wait(ms) {return new Promise((resolve) => {setTimeout(resolve, ms)})}

export const store = {
    sessionVersion: "0.2.0",
    sandbox: path.join(os.homedir(), 'nvxstdo', 'store'),
    sandboxPlain: path.join('nvxstdo', 'store')
}

async function main() {
    // Attempt to bind shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.key == "F9") {
            console.log("F9 Pressed, attempting to disable animations");
            try {
                settings.disableAnimations();
            } catch(err) {
                console.error(`Failed to Disable Animations: ${err}`);
            }
            console.log("Disabled Animations: " + settings.visualSettings.disableAnimations);
        }
    });
    
    // Attempt to initialize Sandbox, fail otherwise.
    try {
        await fs.init();
    } catch {
        document.body.innerHTML = "Failed to create files, Store has stopped execution for your safety.";
        return;
    }
    // Initialize Loading Animation
    load.init();
    const animationDelay = 1000;
    
    try {
        // Attempt to finalize loading process
        await wait(animationDelay);
        tabs.remove('load');
        tooltipsLib.initDelayedTooltips();
        selectspace.init();
        tabs.goto('select-space');
        await selectspace.init();
        /* workspace.init();
        selectspace.selectSpace('My Testing Space');
        tabs.goto('workspace'); */
    } catch(err) {
        console.warn(`Failed to remove loadElement from parent: ${err}`);
    }
}

export function quit() {
    window.close();
}

main();