import * as main from './index.js';
import * as tabs from './tabs.js';
import * as safety from './safety.js';
const Database = require('better-sqlite3');

function getEBD(id) { return document.getElementById(id); }

export let db;
export let dbSpaceId = null;

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

    // Initialize single DB
    const dbPath = main.store.sandbox + '/inventory.db';
    db = new Database(dbPath);

    // Create tables
    db.prepare(`
        CREATE TABLE IF NOT EXISTS spaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            space_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            metadata TEXT,
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
    `).run();

    // Load spaces from DB
    const spaces = db.prepare(`SELECT name FROM spaces`).all().map(r => r.name);

    // Populate select dropdown
    if (spaces.length === 0) {
        const noSpacesOption = document.createElement('option');
        noSpacesOption.textContent = "You have no spaces yet";
        noSpacesOption.disabled = true;
        select.appendChild(noSpacesOption);
    } else {
        spaces.forEach(space => {
            const option = document.createElement('option');
            option.value = space;
            option.textContent = space;
            select.appendChild(option);
        });
    }

    contBtn.addEventListener('click', function() {
        if (select.value === "makeNew") {
            tabs.goto('create-space');
        } else {
            selectSpace(select.value);
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