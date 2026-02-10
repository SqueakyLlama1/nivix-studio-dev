import * as tabs from './tabs.js'
import * as main from './index.js'
const os = require('os');
const path = require('path');
const fs = require('fs');

// Helper Functions
const getEBD = (id) => document.getElementById(id);

// Variables
let templatesPath;
let templates = [];

// Headers
const creationLabel = getEBD('newProject1-creationHeader');
const editingLabel = getEBD('newProject1-editingHeader');

// Button Groups
const creationButtons = getEBD('newProject1-creationActions');
const editingButtons = getEBD('newProject1-editingActions');
const templateActionsCreate = getEBD('newProject1-templateActions-create');
const templateActionsEdit = getEBD('newProject1-templateActions-edit');

// Buttons
const newProject = getEBD('dashboard-getstarted-new');
const creationManage = getEBD('newProject1-creationManage');
const creationRefresh = getEBD('newProject1-creationRefresh');
const creationCancel = getEBD('newProject1-creationCancel');
const editingBack = getEBD('newProject1-editingBack');
const editingRefresh = getEBD('newProject1-editingRefresh');
const editingCreate = getEBD('newProject1-editingCreate');

// Misc
const templateList = getEBD('newProject1-templateList');
const templateOptions = getEBD('newProject1-templateOptions');

export function init() {
    templatesPath = path.join(os.homedir(), main.volt.sandboxPlain, 'templates');
    console.log(`Template Directory: ${templatesPath}`);
    if (!fs.existsSync(templatesPath)) fs.mkdirSync(templatesPath, { recursive: true });
    
    newProject.addEventListener('click', populateTemplateList);
    creationCancel.addEventListener('click', () => tabs.goto('dashboard'));
    creationManage.addEventListener('click', toggleEditingMode);
    editingBack.addEventListener('click', toggleEditingMode);
    creationRefresh.addEventListener('click', populateTemplateList);
    editingRefresh.addEventListener('click', populateTemplateList);
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
    populateTemplateList();
}

function populateTemplateList() {
    templateActionsCreate.classList.add('hidden');
    templateActionsEdit.classList.add('hidden');
    templateOptions.classList.add('hidden');
    templateOptions.replaceChildren();
    templateList.replaceChildren();
    templates = [];
    const allFiles = fs.readdirSync(templatesPath);
    allFiles.forEach(function(file) {
        if (file.endsWith('.vtpl')) {
            let meta;
            try {
                meta = JSON.parse(fs.readFileSync(path.join(templatesPath, file), 'utf8'));
            } catch(err) {
                console.error(`Failed to parse meta data for template: ${file}. Reason: ${err}`);
                return;
            }
            templates.push({src: file, meta: meta});
        }
    });
    if (templates.length) {
        const fragment = document.createDocumentFragment();
        templates.forEach(function(template) {
            const button = document.createElement('button');
            button.id = `newProject1-${template.meta.id}-button`;
            button.innerText = template.meta.name || template.src;
            button.addEventListener('click', function() { loadTemplate(template, this) });
            fragment.appendChild(button);
        });
        templateList.appendChild(fragment);
    } else {
        if (editMode) {
            templateList.textContent = 'No Templates Found. Press Create Template to make one.';
        } else {
            templateList.textContent = 'No Templates Found. Press Manage Templates to make one.';
        }
    }
}

let currentStateValues = {};
let selectedTemplate;

const properties = {
    'directoryStructure': {type: 'checkbox'}
};

function loadTemplate(template, button) {
    templateOptions.classList.add('hidden');
    templateOptions.replaceChildren();
    templateActionsCreate.classList.add('hidden');
    templateActionsEdit.classList.add('hidden');
    selectedTemplate = template.src;
    currentStateValues = {};
    const values = template?.meta?.values || [];
    if (!values.length) {
        return;
    }

    const fragment = document.createDocumentFragment();
    values.forEach(function(value) {
        currentStateValues[value.property] = value.value;
        const input = document.createElement('input');
        const label = document.createElement('label');
        const inputType = (properties[value.property] || { type: 'text' }).type;
        const inputId = `newProject1-${template.meta.id}-${value.property}`;

        input.type = inputType;
        input.id = inputId;

        if (inputType === 'checkbox') {
            input.checked = value.value;
        } else {
            input.value = value.value;
        }

        input.disabled = !editMode;

        label.textContent = value.label;
        label.htmlFor = inputId;

        fragment.appendChild(label);
        fragment.appendChild(input);
    });

    templateOptions.appendChild(fragment);
    templateOptions.classList.remove('hidden');
    if (editMode) {
        templateActionsEdit.classList.remove('hidden');
    } else {
        templateActionsCreate.classList.remove('hidden');
    }

    templateList.querySelectorAll('button.selected').forEach((el) => el.classList.remove('selected'));
    button.classList.add('selected');
}