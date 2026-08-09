import { Electroview } from "electrobun/view";
import { type UpdaterRPCType } from "../../shared/bun/updater_rpc_type";

const logicDelay = 100; // Delay after each task in the check updates function, in milleseconds, for flair.

const rpc = Electroview.defineRPC<UpdaterRPCType>({
    handlers: {
        requests: {},
        messages: {
            displayDebug({ message, type }) {
                console.log(`RPC Message Recieved: ${message}, ${type}`);
                displayDebug(message, type);
            },
            readyToCheckUpdates() {
                checkUpdates();
            }
        },
    }
});
const electroview = new Electroview({ rpc });

function wait(ms: number) {return new Promise(resolve => setTimeout(resolve, ms));}
function getEBD(id: string) {return document.getElementById(id);}

async function displayDebug(message: string, type = '') {
    console.log(`Display Debug Function Recieved: ${message}, ${type}`);
    const outputElement = getEBD('debug_output');
    
    const messageElement = document.createElement('span') as HTMLElement;
    messageElement.className = type;
    messageElement.innerText = message;
    
    outputElement?.replaceChildren(messageElement);

    if (type === 'error') {
        const loader = getEBD('loader');
        // Remove loader to indicate a fatal error, and that the app is no longer loading and will not progress further.
        loader?.parentNode?.removeChild(loader);
        const message = 'Execution halted due to a fatal error.';
        console.log(message);
        throw new Error(message); // Halts Execution, due to unhandled exception.
    }
}

const quitBtn = getEBD('quitBtn');

async function init() {
    quitBtn?.addEventListener('click', () => {
        electroview.rpc?.request.close();
    });
}

async function checkUpdates() {
    displayDebug('Checking for updates...');
    const updateAvailable = await electroview.rpc?.request.checkUpdate();
    if (updateAvailable) {
        await wait(logicDelay);
        displayDebug(`New version ${updateAvailable} is available. Download now?`);
    } else {
        await wait(logicDelay);
        displayDebug(`No new versions found, continuing to store..`);
        await wait(logicDelay);
        electroview.rpc?.request.storeHandoff();
    }
}

document.addEventListener('DOMContentLoaded', init);