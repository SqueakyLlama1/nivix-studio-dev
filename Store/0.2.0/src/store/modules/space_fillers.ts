import { loadCSS } from './file_loader.ts';
import { programaticAnimationDuration, fadeOutAnimation } from './tabs.ts';
import { preferences } from './settings.ts';

function getEBD(id: string) { return document.getElementById(id); }
function wait(ms: number) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

export async function init() {
    await loadCSS('sheets/space_fillers.css');
    fillSpaceContainer();
}

const shapeElementType: string = 'div';
const baseShapeClass: string = 'space_filler_shape';
const delay: number = 25; // Delay between each shape being added, in milliseconds.
let currentCallId = 0;
let lastCombinationIndex: number | null = null; // Tracks previous selection to prevent duplicates

// List of available floating animation keyframes defined in space_fillers.css
const floatAnimations = ['float', 'float_slow', 'float_fast', 'float_subtle'];

export async function fillSpaceContainer() {
    const callId = ++currentCallId;

    const combinations = [
        [ "circle1", "polygon4", "circle6", "triangle3", "triangle4", "polygon3", "polygon1", "circle2", "triangle5", "polygon6", "circle7" ],
        [ "polygon2", "triangle6", "circle5", "polygon1", "circle4", "triangle5", "circle1", "polygon5", "triangle3", "circle7", "triangle1" ],
        [ "circle3", "triangle1", "triangle7", "polygon6", "circle7", "polygon4", "circle1", "triangle4", "polygon2", "circle5" ],
        [ "circle6", "polygon4", "triangle3", "polygon1", "circle5", "triangle2", "polygon5", "circle2", "triangle7", "polygon3", "circle7" ],
        [ "circle1", "polygon2", "triangle6", "triangle4", "polygon5", "circle7", "polygon1", "circle3", "triangle5", "circle5", "polygon3" ],
        [ "polygon4", "triangle1", "circle3", "triangle2", "polygon3", "circle4", "polygon6", "triangle7", "circle1", "triangle6" ],
        [ "circle1", "triangle3", "polygon1", "triangle7", "polygon6", "circle2", "polygon2", "circle4", "triangle4", "polygon5", "circle5" ],
        [ "circle6", "polygon4", "triangle3", "polygon1", "triangle7", "polygon6", "circle7", "circle2", "triangle2", "polygon5", "circle4", "triangle5" ],
        [ "circle1", "triangle6", "polygon5", "triangle2", "circle7", "polygon3", "circle4", "triangle3", "polygon1", "circle3" ],
        [ "circle3", "polygon2", "triangle4", "polygon1", "triangle5", "circle2", "circle6", "polygon6", "triangle7", "circle4", "polygon5" ]
    ];
    
    const container = getEBD('space_filler_container') as HTMLDivElement;
    if (!container) return;

    const disableAnimations = !!preferences['disableAnimations'];
    const disableShapeAnimations = !!preferences['disableShapeAnimations'];

    if (!disableAnimations && container.children.length > 0) {
        container.style.animation = 'none';
        void container.offsetWidth; // Force CSS reflow to restart animation keyframe reliably
        container.style.animation = fadeOutAnimation;
    }

    // Pick a new combination index that is strictly different from the last one
    let randNum: number;
    do {
        randNum = Math.floor(Math.random() * combinations.length);
    } while (combinations.length > 1 && randNum === lastCombinationIndex);
    
    lastCombinationIndex = randNum;
    const combination = combinations[randNum];

    // Wait out the fade duration if animations are enabled
    if (!disableAnimations) {
        await wait(programaticAnimationDuration);
    }

    if (callId !== currentCallId) return;

    container.style.animation = 'none';
    container.replaceChildren();

    for (let shapeClass of combination) {
        if (callId !== currentCallId) return;

        const shapeElement = document.createElement(shapeElementType);
        shapeElement.classList.add(baseShapeClass, shapeClass);

        const randomFloat = floatAnimations[Math.floor(Math.random() * floatAnimations.length)];
        const randomDuration = Math.floor(Math.random() * 16) + 10;
        const floatStyle = `${randomFloat} ${randomDuration}s ease-in-out infinite`;

        if (disableAnimations) {
            if (!disableShapeAnimations) {
                shapeElement.style.animation = floatStyle;
            }
        } else {
            shapeElement.style.animation = 'fadeInShape 0.3s ease-out forwards';

            if (!disableShapeAnimations) {
                shapeElement.addEventListener('animationend', (e: AnimationEvent) => {
                    if (e.animationName === 'fadeInShape') {
                        shapeElement.style.animation = floatStyle;
                    }
                }, { once: true });
            }
        }

        container.appendChild(shapeElement);

        if (!disableAnimations) {
            await wait(delay);
        }
    }
}

window.addEventListener('tabchange', fillSpaceContainer);