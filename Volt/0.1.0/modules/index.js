import * as load from './load.js'
import * as tabs from './tabs.js'
import * as dashboard from './dashboard.js'
import * as newproject from './newproject.js'

function wait(ms) {return new Promise((resolve) => {setTimeout(resolve, ms)})}

export const nodeforge = {
    sessionVersion: "0.1.0"
}

async function main() {
    load.init();
    const animationDelay = 1000;
    
    try {
        await wait(animationDelay);
        tabs.remove('load');
        dashboard.init();
        tabs.show('dashboard');
        newproject.init();
    } catch(err) {
        console.warn(`Failed to remove loadElement from parent: ${err}`);
    }
}

export function quit() {
    window.close();
}

main();