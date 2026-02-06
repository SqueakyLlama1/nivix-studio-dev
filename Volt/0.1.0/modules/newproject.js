import * as tabs from './tabs.js'
import * as main from './index.js'
const os = require('os');
const path = require('path');
const fs = require('fs');

// Variables
let templatesPath;
let templates = [];

// Labels
const creationLabel = getEBD('newProject1-creationHeader');
const editingLabel = getEBD('newProject1-editingHeader');

// Button Sections
const creationButtons = getEBD('newProject1-creationActions');
const editingButtons = getEBD('newProject1-editingActions');

// Editing Buttons
const editingBack = getEBD('newProject1-editingBack');

// Creation Buttons
const manageTemplates = getEBD('newProject1-manageTemplates');
const cancelBtn = getEBD('newProject1-cancel');

function getEBD(id) {return document.getElementById(id)};

export function init() {
    cancelBtn.addEventListener('click', function() { tabs.goto("dashboard"); });
    manageTemplates.addEventListener('click', toggleEditingMode);
    editingBack.addEventListener('click', toggleEditingMode);
    
    
    templatesPath = path.join(os.homedir(), main.nodeforge.sandboxPlain, 'templates');
    console.log(`Template Directory: ${templatesPath}`);
}

let editMode = false;

function toggleEditingMode() {
    if (!editMode) {
        creationButtons.classList.add('hidden');
        editingButtons.classList.remove('hidden');
        creationLabel.classList.add('hidden');
        editingLabel.classList.remove('hidden');
    } else {
        creationButtons.classList.remove('hidden');
        editingButtons.classList.add('hidden');
        creationLabel.classList.remove('hidden');
        editingLabel.classList.add('hidden');
    }
    editMode = !editMode;
}

function loadTemplates() {
    const allFiles = fs.readdirSync(templatesPath);
    allFiles.forEach(function(file) {
        if (file.includes('.vtpl')) {
            templates.push(file);
        }
    });
}

function loadTemplate(template, button) {
    const templatePath = path.join(templatesPath, `${template}.vtpl`);
    const templateMeta = JSON.parse(fs.readFileSync(templatePath));
}