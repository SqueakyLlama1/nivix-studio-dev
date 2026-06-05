import { visualSettings } from './settings.js';
import { unloadCSS } from './file_loader.js';

let previousTab;

function getEBD(id) {return document.getElementById(id)};
function wait(ms) {return new Promise((resolve) => {setTimeout(resolve, ms)})}

export let programaticAnimationDuration = visualSettings.disableAnimations ? 0 : 325;

const fadeInAnimation = "fadeInPage 0.3s ease-out forwards";
const fadeOutAnimation = "fadeOutPage 0.3s ease-in-out forwards";

export async function remove(id, options = {}) {
    const instant = options.instant !== undefined ? options.instant : visualSettings.disableAnimations;
    const thisElement = getEBD(id);
    if (instant) {
        thisElement.parentElement.removeChild(thisElement);
    } else {
        thisElement.style.animation = fadeOutAnimation;
        await wait(programaticAnimationDuration);
        thisElement.parentElement.removeChild(thisElement);
    }
}

export async function goto(id, options = {}) {
    const instant = options.instant !== undefined ? options.instant : visualSettings.disableAnimations;
    let logPrevious = options.logPrevious !== undefined ? options.logPrevious : true;
    const display = options.display;

    if (id == 'previous') {
        if (!previousTab) {
            // Add a soft error here
            return;
        }
        id = previousTab;
        logPrevious = false;
    }

    let tabsHidden = 0;
    let lastHiddenTab;
    const existingTabs = document.querySelectorAll('.tab');

    existingTabs.forEach(function(existingTab) {
        let existingTabElement = getEBD(existingTab.id);
        if (!existingTabElement || existingTabElement.style.display == 'none' || existingTabElement.style.display == '') {
            return;
        }
        hide(existingTab.id, { instant });
        tabsHidden++;
        lastHiddenTab = existingTab.id;
    });

    if (!logPrevious) console.log(`Not logging '${lastHiddenTab}' as previous tab.`);
    if (tabsHidden > 0 && logPrevious) {
        previousTab = lastHiddenTab;
    }

    if (!instant) await wait(programaticAnimationDuration);
    show(id, { instant, display });
}

export async function hide(id, options = {}) {
    const instant = options.instant !== undefined ? options.instant : visualSettings.disableAnimations;
    const thisElement = getEBD(id);

    if (instant) {
        thisElement.style.display = "none";
    } else {
        thisElement.style.animation = fadeOutAnimation;
        await wait(programaticAnimationDuration);
        thisElement.style.display = "none";
    }
}

export async function show(id, options = {}) {
    const instant = options.instant !== undefined ? options.instant : visualSettings.disableAnimations;
    const thisDisplay = options.display ? options.display : "block";
    const thisElement = getEBD(id);

    if (instant) {
        thisElement.style.display = thisDisplay;
    } else {
        thisElement.style.display = thisDisplay;
        thisElement.style.animation = fadeInAnimation;
        await wait(programaticAnimationDuration);
    }
}