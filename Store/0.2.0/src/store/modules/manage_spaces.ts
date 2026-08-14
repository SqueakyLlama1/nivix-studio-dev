import { loadCSS } from "./file_loader";
import { show_notification, show_popup } from "./notifications";
import { preferences } from "./settings";

import * as tabs from './tabs';

import { electroview } from "./index";
import { type TabChangeEventDetail } from "../../shared/bun/store_types";

function getEBD<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let isInitialized: boolean = false;

const fadeOutAnimation = "nivixFadeOut 0.2s ease-out forwards";
const fadeInAnimation = "nivixFadeIn 0.3s ease-out forwards";
const programaticAnimationDuration = 200;
const itemDelay = 25; // Adjust this (in ms) to make the staggered pops faster or slower

const backBtn = getEBD<HTMLButtonElement>('manage_spaces_back');
const refreshBtn = getEBD<HTMLButtonElement>('manage_spaces_refresh');
const createBtn = getEBD<HTMLButtonElement>('manage_spaces_create');

export function init(): void {
    if (isInitialized) return;

    loadCSS('sheets/manage_spaces.css');

    backBtn.addEventListener('click', () => {
        tabs.goto('previous');
    });

    refreshBtn.addEventListener('click', () => {
        populate_spaces_list(true);
    });

    createBtn.addEventListener('click', () => {
        tabs.goto('create_space');
    });

    isInitialized = true;
}

async function populate_spaces_list(fadeOut?: boolean): Promise<void> {
    const spacesList = getEBD<HTMLDivElement>('manage_spaces_list');

    // Smoothly fade out existing items
    if (fadeOut && !preferences['disableAnimations']) {
        const existingItems = spacesList.querySelectorAll<HTMLElement>('.item');
        if (existingItems.length > 0) {
            existingItems.forEach((item) => {
                item.style.animation = fadeOutAnimation;
            });

            await wait(programaticAnimationDuration);
            existingItems.forEach((item) => item.remove());
        }
    }

    // Clear any remaining elements
    spacesList.innerHTML = '';

    // Fetch spaces list via RPC
    const spaces = await electroview.rpc!.request.listSpaces();
    if (!spaces.length) {
        spacesList.innerText = `You have no spaces. Click 'Create New' at the bottom of this menu to get started!`;
    }

    // Sequentially build and append items so they pop up one by one
    for (const space of spaces) {
        const containerEl = document.createElement('div');
        const nameEl = document.createElement('span');
        const actionsContainerEl = document.createElement('div');
        const renameBtn = document.createElement('button');
        const deleteBtn = document.createElement('button');

        containerEl.className = 'item';
        nameEl.className = 'name-column';
        nameEl.innerText = space.name;

        renameBtn.textContent = 'Rename';
        renameBtn.className = 'nivix_primary_button';
        renameBtn.onclick = async () => {
            const new_name = await show_popup(
                `Renaming '${space.name}'`, 
                "text", 
                undefined, 
                { placeholder: "New Name" }
            );

            if (new_name && new_name !== space.name) {
                await electroview.rpc!.request.renameSpace({ id: space.id, name: new_name });
                populate_spaces_list(true);
            }
        };

        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'nivix_primary_button';
        deleteBtn.onclick = async (e: MouseEvent) => {
            const verified = e.shiftKey ? true : await show_popup(
                `Are you sure you want to delete the space '${space.name}'? This cannot be undone.`, 
                "options", 
                [
                    { content: "No", value: false, highlighted: true }, 
                    { content: "Yes", value: true, highlighted: false }
                ]
            );

            if (verified) {
                try {
                    show_notification(`Attempting to delete space '${space.name}'`);
                    await electroview.rpc!.request.deleteSpace(space.id);
                    populate_spaces_list(true);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    show_notification(`Failed to delete space '${space.name}': ${message}`, "error");
                }
            }
        };

        actionsContainerEl.className = 'actions';
        actionsContainerEl.appendChild(renameBtn);
        actionsContainerEl.appendChild(deleteBtn);

        containerEl.appendChild(nameEl);
        containerEl.appendChild(actionsContainerEl);

        // Apply fade/pop animation if enabled in preferences
        if (!preferences['disableAnimations']) {
            containerEl.style.animation = fadeInAnimation;
        }

        // Append to DOM immediately
        spacesList.appendChild(containerEl);

        // Stagger delay before appending the next item
        await wait(itemDelay);
    }
}

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'manage_spaces') {
        init();
        populate_spaces_list();
    }
});