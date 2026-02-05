import { visualSettings } from "./settings.js";
function getEBD(id) {return document.getElementById(id)};
function wait(ms) {return new Promise((resolve) => {setTimeout(resolve, ms)})}

export let programaticAnimationDuration = visualSettings.disableAnimations ? 0 : 325;

const fadeInAnimation = "fadeInPage 0.3s ease-out forwards";
const fadeOutAnimation = "fadeOutPage 0.3s ease-in-out forwards";

export async function remove(id, instant = visualSettings.disableAnimations) {
    const thisElement = getEBD(id);
    if (instant) {
        thisElement.parentElement.removeChild(thisElement);
    } else {
        thisElement.style.animation = fadeOutAnimation;
        await wait(programaticAnimationDuration);
        thisElement.parentElement.removeChild(thisElement);
    }
}

export async function goto(id, instant = visualSettings.disableAnimations, display) {
    const existingTabs = document.querySelectorAll('.tab');
    existingTabs.forEach(function(existingTab) {
        hide(existingTab.id, instant);
    });
    await wait(programaticAnimationDuration);
    show(id, instant, display);
}

export async function hide(id, instant = visualSettings.disableAnimations) {
    const thisElement = getEBD(id);
    if (instant) {
        thisElement.style.display = "none";
    } else {
        thisElement.style.animation = fadeOutAnimation;
        await wait(programaticAnimationDuration);
        thisElement.style.display = "none";
    }
}

export async function show(id, instant = visualSettings.disableAnimations, display) {
    const thisElement = getEBD(id);
    const thisDisplay = display ? display : "block";
    if (instant) {
        thisElement.style.display = thisDisplay;
    } else {
        thisElement.style.display = thisDisplay;
        thisElement.style.animation = fadeInAnimation;
        await wait(programaticAnimationDuration);
    }
}