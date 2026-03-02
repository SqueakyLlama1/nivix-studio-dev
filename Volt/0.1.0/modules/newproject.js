import * as tabs from './tabs.js';
import * as main from './index.js';
const fs = require('fs');
const path = require('path');
const os = require('os');

let root;

const ui = {};
const state = {
    mode: 'create',
    templates: [],
    selected: null,
    options: {},
    baseline: {}
};


let protectedTemplates = ['default'];

const optionSchema = {
    directoryStructure: {
        type: 'checkbox',
        label: 'Create directory structure'
    }
};

export function init() {
    root = document.getElementById('newProject1');

    // Header labels
    ui.titleCreate = root.querySelector('[data-role="title-create"]');
    ui.titleManage = root.querySelector('[data-role="title-manage"]');

    // Template list and options panel
    ui.templateList = root.querySelector('[data-role="template-list"]');
    ui.options = root.querySelector('[data-role="options"]');

    // Action panels
    ui.actionsCreate = root.querySelector('[data-role="actions-create"]');
    ui.actionsManage = root.querySelector('[data-role="actions-manage"]');
    ui.createActions = root.querySelector('[data-role="create-actions"]');
    ui.editActions = root.querySelector('[data-role="edit-actions"]');

    // Action buttons
    ui.saveButton = root.querySelector('[data-action="save-template"]');
    ui.deleteButton = root.querySelector('[data-action="delete-template"]');
    ui.exportButton = root.querySelector('[data-action="export-template"]');

    root.addEventListener('click', handleAction);

    setMode('create');
}

function handleAction(e) {
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === 'manage') setMode('manage');
    if (action === 'back') setMode('create');
    if (action === 'refresh') loadTemplates();
    if (action === 'cancel') tabs.goto('dashboard');
    if (action === 'export-template') exportTemplate();
}

function setMode(mode) {
    state.mode = mode;

    ui.titleCreate.classList.toggle('hidden', mode !== 'create');
    ui.titleManage.classList.toggle('hidden', mode !== 'manage');

    ui.actionsCreate.classList.toggle('hidden', mode !== 'create');
    ui.actionsManage.classList.toggle('hidden', mode !== 'manage');

    ui.createActions.classList.add('hidden');
    ui.editActions.classList.add('hidden');
    ui.options.classList.add('hidden');

    clearSelection();
}

function clearSelection() {
    state.selected = null;
    state.options = {};
    state.baseline = {};

    ui.options.replaceChildren();

    ui.templateList
        .querySelectorAll('button.selected')
        .forEach((b) => b.classList.remove('selected'));

    updateActionStates();
}

function loadTemplates() {
    ui.templateList.replaceChildren();
    state.templates = [];

    const templatesPath = path.join(os.homedir(), main.volt.sandboxPlain, 'templates');
    if (!fs.existsSync(templatesPath)) fs.mkdirSync(templatesPath, { recursive: true });

    fs.readdirSync(templatesPath).forEach((file) => {
        if (!file.endsWith('.vtpl')) return;
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(templatesPath, file), 'utf8'));
            state.templates.push({ file, meta });
        } catch {}
    });

    if (!state.templates.length) {
        ui.templateList.textContent =
            state.mode === 'manage'
                ? 'No Templates Found. Press Create Template.'
                : 'No Templates Found. Press Manage Templates.';
        return;
    }

    state.templates.forEach((template) => {
        const button = document.createElement('button');
        button.textContent = template.meta.name || template.file;

        button.addEventListener('click', () => selectTemplate(template, button));
        ui.templateList.appendChild(button);
    });
}

function selectTemplate(template, button) {
    clearSelection();

    button.classList.add('selected');
    state.selected = template;

    buildOptions(template, button.textContent);

    ui.options.classList.remove('hidden');

    if (state.mode === 'create') ui.createActions.classList.remove('hidden');
    else ui.editActions.classList.remove('hidden');

    updateActionStates();
}

function buildOptions(template, titleText) {
    ui.options.replaceChildren();
    state.options = {};
    state.baseline = {};

    // Header for the options panel
    const header = document.createElement('h3');
    header.textContent = titleText;
    ui.options.appendChild(header);

    const values = {};
    (template.meta.values || []).forEach((v) => {
        values[v.property] = v.value;
    });

    Object.keys(optionSchema).forEach((key) => {
        const def = optionSchema[key];

        // Flex wrapper for checkbox + label
        const wrapper = document.createElement('div');
        wrapper.classList.add('option-wrapper');

        const input = document.createElement('input');
        const label = document.createElement('label');
        label.textContent = def.label || key;

        input.type = def.type;
        input.disabled = state.mode !== 'manage';

        if (def.type === 'checkbox') {
            const checked = Boolean(values[key]);
            input.checked = checked;
            state.options[key] = checked;
            state.baseline[key] = checked;

            input.addEventListener('change', () => {
                state.options[key] = input.checked;
                updateActionStates();
            });
        } else {
            const value = values[key] ?? '';
            input.value = value;
            state.options[key] = value;
            state.baseline[key] = value;

            input.addEventListener('input', () => {
                state.options[key] = input.value;
                updateActionStates();
            });
        }

        // Append input first, then label into flex wrapper
        wrapper.appendChild(input);
        wrapper.appendChild(label);

        // Append wrapper to options container
        ui.options.appendChild(wrapper);
    });
}

function isProtectedTemplate(template) {
    return protectedTemplates.includes(template.meta.id);
}

function hasDirtyState() {
    return JSON.stringify(state.options) !== JSON.stringify(state.baseline);
}

function updateActionStates() {
    if (ui.saveButton)
        ui.saveButton.disabled = state.mode !== 'manage' || !state.selected || !hasDirtyState();

    if (ui.deleteButton)
        ui.deleteButton.disabled = state.mode !== 'manage' || !state.selected || isProtectedTemplate(state.selected);

    if (ui.exportButton) ui.exportButton.disabled = !state.selected;
}

export function exportTemplate() {
    if (!state.selected) return;

    const exportMeta = {
        ...state.selected.meta,
        values: Object.keys(state.options).map((prop) => ({
            property: prop,
            value: state.options[prop],
            label: optionSchema[prop]?.label || prop
        }))
    };

    const json = JSON.stringify(exportMeta, null, 4);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `${exportMeta.id || 'template'}_export.vtpl`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}