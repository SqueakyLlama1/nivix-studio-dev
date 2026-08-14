import { preferences } from './settings';
import { type TabOptions } from '../../shared/bun/store_types';

let navigationHistory: { id: string; display?: string }[] = [];
let navigationQueue: Promise<void> = Promise.resolve();

function getEBD(id: string) {return document.getElementById(id)}
function wait(ms: number) {return new Promise((resolve) => { setTimeout(resolve, ms)})}

export const programaticAnimationDuration = preferences['disableAnimations'] ? 0 : 325;

const fadeInAnimation = "nivixFadeIn 0.3s ease-out forwards";
const fadeOutAnimation = "nivixFadeOut 0.3s ease-out forwards";

export async function remove(id: string, options: TabOptions = {}) {
    const instant = options.instant !== undefined ? options.instant : preferences['disableAnimations'];
    const thisElement = getEBD(id) as HTMLElement;
    if (instant) {
        thisElement.remove();
    } else {
        thisElement.style.animation = fadeOutAnimation;
        await wait(programaticAnimationDuration);
        thisElement.remove();
    }
}

export function goto(id: string, options: TabOptions = {}): Promise<void> {
    const navigation = navigationQueue.then(() => gotoNow(id, options));
    navigationQueue = navigation.catch(() => undefined);
    return navigation;
}

async function gotoNow(id: string, options: TabOptions = {}) {
    const instant = options.instant !== undefined ? options.instant : preferences['disableAnimations'];
    let logPrevious = options.logPrevious !== undefined ? options.logPrevious : true;
    let display = options.display;

    if (id === 'previous') {
        const lastTab = navigationHistory.pop();
        if (!lastTab) {
            console.warn('No previous tab found in history navigation stack.');
            return;
        }
        id = lastTab.id;
        if (display === undefined) {
            display = lastTab.display;
        }
        logPrevious = false;
    }

    let tabsHidden = 0;
    let lastHiddenTab: { id: string; display?: string } | undefined;
    const existingTabs = document.querySelectorAll('.tab');

    existingTabs.forEach(function(existingTab) {
        let existingTabElement = getEBD(existingTab.id);
        if (!existingTabElement || existingTabElement.style.display === 'none' || existingTabElement.style.display === '') {
            return;
        }
        
        const activeDisplay = existingTabElement.style.display || getComputedStyle(existingTabElement).display;

        hide(existingTab.id, { instant });
        tabsHidden++;
        lastHiddenTab = { id: existingTab.id, display: activeDisplay };
    });

    if (logPrevious && tabsHidden > 0 && lastHiddenTab) {
        navigationHistory.push(lastHiddenTab);
    }

    if (!instant) await wait(programaticAnimationDuration);
    show(id, { instant, display });
}

export async function hide(id: string, options: TabOptions = {}) {
    const instant = options.instant !== undefined ? options.instant : preferences['disableAnimations'];
    const thisElement = getEBD(id) as HTMLElement;

    if (instant) {
        thisElement.style.display = "none";
    } else {
        thisElement.style.animation = fadeOutAnimation;
        await wait(programaticAnimationDuration);
        thisElement.style.display = "none";
    }
}

export async function show(id: string, options: TabOptions = {}) {
    const instant = options.instant !== undefined ? options.instant : preferences['disableAnimations'];
    const thisDisplay = options.display ? options.display : "block";
    const thisElement = getEBD(id) as HTMLElement;

    window.dispatchEvent(
        new CustomEvent('tabchange', {
            detail: {
                tabId: id,
            },
        })
    );

    if (instant) {
        thisElement.style.display = thisDisplay;
        thisElement.style.animation = "";
    } else {
        thisElement.style.display = thisDisplay;
        thisElement.style.animation = fadeInAnimation;
        await wait(programaticAnimationDuration);
        
        thisElement.style.animation = ""; 
    }
}