import * as main from './index.js';
import * as tabs from './tabs.js';
import * as safety from './safety.js';
import * as workspace from './workspace.js'

function getEBD(id) { return document.getElementById(id); }


export async function init() {
    // Helper Functions
    const shapeAnimationProperty = "float 17s ease-in-out infinite";
    function disableShapeAnimations() {
        const shapes = document.querySelectorAll('.space-filler-shape');
        shapes.forEach(function(shape) {
            shape.style.animation = "none";
        });
        console.log("Disabled Shape Filler Animation")
    }
    function enableShapeAnimations() {
        const shapes = document.querySelectorAll('.space-filler-shape');
        shapes.forEach(function(shape) {
            shape.style.animation = shapeAnimationProperty;
        });
        console.log("Enabled Space Filler Animation");
    }
    // UI elements
    const quitBtn = getEBD("select-space-quit");
    const contBtn = getEBD("select-space-continue");
    const select = getEBD("select-space-option");
    
    const backBtn = getEBD("create-space-back");
    const createBtn = getEBD("create-space-create");
    const spaceName = getEBD("create-space-name");
    const formatTooltip = getEBD('create-space-formatting-tooltip');
    
    const shapeAnimToggle = getEBD('select-space-shapeAnimToggle');
    
    quitBtn.addEventListener('click', window.close);
    shapeAnimToggle.addEventListener('change', () => {
        shapeAnimToggle.checked ? disableShapeAnimations() : enableShapeAnimations();
    });
    
    // Populate select dropdown
    const noSpacesOption = document.createElement('option');
    noSpacesOption.textContent = "You have no spaces yet";
    noSpacesOption.disabled = true;
    select.appendChild(noSpacesOption);
    
    contBtn.addEventListener('click', function() {
        if (select.value === "makeNew") {
            tabs.goto('create-space');
        } else {
            selectSpace(select.value);
            workspace.init();
            tabs.goto('workspace');
        }
    });
    
    backBtn.addEventListener('click', () => tabs.goto('select-space'));
    
    createBtn.addEventListener('click', function() {
        if (safety.isSafe(spaceName.value, true)) {
            db.prepare(`INSERT OR IGNORE INTO spaces (name) VALUES (?)`).run(spaceName.value);
            location.reload();
        } else {
            safety.filterInput(spaceName);
            formatTooltip.focus();
        }
    });
}

// Select a space to operate on
export function selectSpace(space) {
    if (typeof space !== "string") return;
    console.log(`Attemping to select space: ${space}`);
    const row = db.prepare(`SELECT * FROM spaces WHERE name = ?`).get(space);
    if (!row) throw new Error("Space not found in database");
    dbSpaceId = row.id;
    console.log(`Currently Selected Space: ${dbSpaceId}`);
}

// Groups
export function addGroup(groupName) {
    if (!dbSpaceId) throw new Error("No space selected");
    db.prepare(`INSERT INTO groups (space_id, name) VALUES (?, ?)`).run(dbSpaceId, groupName);
}

export function getGroups(spaceId) {
    return db.prepare(`SELECT * FROM groups WHERE space_id = ?`).all(spaceId);
}

// Items
export function addItem(groupId, name, quantity = 1, metadata = {}) {
    db.prepare(`INSERT INTO items (group_id, name, quantity, metadata) VALUES (?, ?, ?, ?)`)
    .run(groupId, name, quantity, JSON.stringify(metadata));
}

export function getItems(spaceId) {
    return db.prepare(`
        SELECT items.*, groups.name AS group_name
        FROM items
        JOIN groups ON items.group_id = groups.id
        WHERE groups.space_id = ?
    `).all(spaceId);
    }