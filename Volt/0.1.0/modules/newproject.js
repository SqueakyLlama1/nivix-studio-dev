import * as tabs from './tabs.js'
import * as main from './index.js'
const os = require('os');
const path = require('path');
const fs = require('fs');

// Helper Functions
function getEBD(id) {return document.getElementById(id)};
function pretty(str) {return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');}

// Variables
let templatesPath;
let templates = [];

// Headers
const creationLabel = getEBD('newProject1-creationHeader');
const editingLabel = getEBD('newProject1-editingHeader');

// Button Sections
const creationButtons = getEBD('newProject1-creationActions');
const editingButtons = getEBD('newProject1-editingActions');

// Buttons
const creationManage = getEBD('newProject1-creationManage');
const creationRefresh = getEBD('newProject1-creationRefresh');
const creationCancel = getEBD('newProject1-creationCancel');
const editingBack = getEBD('newProject1-editingBack');
const editingRefresh = getEBD('newProject1-editingRefresh');
const editingCreate = getEBD('newProject1-editingCreate');

// Misc
const templateList = getEBD("newProject1-templateList");
const templateView = getEBD("newProject1-templateView");

export function init() {
    templatesPath = path.join(os.homedir(), main.volt.sandboxPlain, 'templates');
    console.log(`Template Directory: ${templatesPath}`);
    if (!fs.existsSync(templatesPath)) fs.mkdirSync(templatesPath);
    
    creationCancel.addEventListener('click', function() { tabs.goto("dashboard"); });
    creationManage.addEventListener('click', toggleEditingMode);
    editingBack.addEventListener('click', toggleEditingMode);
    creationRefresh.addEventListener('click', populateTemplateList);
    editingRefresh.addEventListener('click', populateTemplateList);
}

let editMode = false;

function toggleEditingMode() {
    templateView.classList.add('hidden');
    templateView.innerHTML = "";
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
    templateList.innerHTML = "";
    templates = [];
    const allFiles = fs.readdirSync(templatesPath);
    allFiles.forEach(function(file) {
        if (file.includes('.vtpl')) {
            let meta;
            try {
                meta = JSON.parse(fs.readFileSync(path.join(templatesPath, file)));
            } catch(err) {
                console.error(`Failed to parse meta data for template: ${file}. Reason: ${err}`);
                return;
            }
            templates.push({src: file, meta: meta});
        }
    });
    if (templates.length) {
        templates.forEach(function(template) {
            const button = document.createElement('button');
            button.id = `newProject1-${template.meta.id}-button`;
            button.innerText = template.meta.name || template;
            button.addEventListener('click', function() { loadTemplate(template, this) });
            templateList.appendChild(button);
        });
    } else {
        if (editMode) {
            templateList.innerHTML = "No Templates Found. Press Create Template to make one.";
        } else {
            templateList.innerHTML = "No Templates Found. Press Manage Templates to make one.";
        }
    }
}

let currentStateValues = {};

const properties = {
    "directoryStructure": {type: "checkbox"}
};

function loadTemplate(template, button) {
    console.log("Loading Template");
    template.meta.values.forEach(function(value) {
        const input = document.createElement('input');
        const label = document.createElement('label');
        const inputType = properties[value.property].type;
        const id = `newProject1-${template.meta.id}-${value.property}`;
        console.log(id);
        input.type = inputType;
        if (inputType == "checkbox") {
            input.checked = value.value;
        } else {
            input.value = value.value;
        }
        
    });
}