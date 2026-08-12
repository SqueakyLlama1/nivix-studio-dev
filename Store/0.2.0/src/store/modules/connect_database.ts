import { loadCSS } from "./file_loader.ts";
import * as tabs from './tabs.ts';
import * as notifications from './notifications.ts';
import * as select_space from './select_space.ts';
import { preferences, setPreference } from './settings.ts';

import { electroview } from "./index.ts";
import type { TabChangeEventDetail } from "../../shared/bun/store_types.ts";

function getEBD<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[Connect Database] Required element with ID '${id}' was not found in the DOM.`);
    }
    return el as T;
}

const backBtn = getEBD<HTMLButtonElement>('connect_database_back');
const form = getEBD<HTMLFormElement>('connect_database_form');
const submitBtn = getEBD<HTMLButtonElement>('connect_database_connect');

const prefixInput = getEBD<HTMLInputElement>('connect_database_prefix');
const hostnameInput = getEBD<HTMLInputElement>('connect_database_hostname');
const portInput = getEBD<HTMLInputElement>('connect_database_port');
const databaseInput = getEBD<HTMLInputElement>('connect_database_database');
const usernameInput = getEBD<HTMLInputElement>('connect_database_username');
const passwordInput = getEBD<HTMLInputElement>('connect_database_password');

const urlInput = getEBD<HTMLInputElement>('connect_database_url');
const urlSubmitBtn = getEBD<HTMLButtonElement>('connect_database_url_submit');

const profileSelection = getEBD<HTMLSelectElement>('connect_database_profiles');
const profileLoadBtn = getEBD<HTMLButtonElement>('connect_database_profile_load');
const profileNameInput = getEBD<HTMLInputElement>('connect_database_profile_name');
const profileSaveBtn = getEBD<HTMLButtonElement>('connect_database_profile_save');
const profileDeleteBtn = getEBD<HTMLButtonElement>('connect_database_profile_delete');
const saveLastProfileToggle = getEBD<HTMLInputElement>('connect_database_save_last_profile');

const statusOutput = getEBD<HTMLSpanElement>('connect_database_status');
const disconnectBtn = getEBD<HTMLButtonElement>('connect_database_disconnect');

let isInitialized = false;
let connected = false;

type ConnectionDetails =
| { mode: 'fields'; prefix: string; hostname: string; port: string; database: string; username: string }
| { mode: 'url'; url: string };
type ConnectionProfile = { name: string; connection: ConnectionDetails };

function sanitizeCustomURL(connectionString: string): string | null {
    try {
        const url = new URL(connectionString.trim());
        url.password = '';
        for (const key of [...url.searchParams.keys()]) {
            if (/pass(word)?|pwd|secret|token/i.test(key)) url.searchParams.delete(key);
        }
        return url.toString();
    } catch {
        return null;
    }
}

function currentConnectionDetails(): ConnectionDetails | null {
    const customURL = urlInput?.value.trim() || '';
    if (customURL) {
        const url = sanitizeCustomURL(customURL);
        return url ? { mode: 'url', url } : null;
    }
    
    return {
        mode: 'fields',
        prefix: prefixInput?.value.trim() || 'mysql://',
        hostname: hostnameInput?.value.trim() || '',
        port: portInput?.value.trim() || '',
        database: databaseInput?.value.trim() || '',
        username: usernameInput?.value.trim() || ''
    };
}

function getProfiles(): ConnectionProfile[] {
    const profiles = preferences['databaseConnectionProfiles'];
    return Array.isArray(profiles) ? profiles as ConnectionProfile[] : [];
}

function renderProfiles() {
    if (!profileSelection) return;
    const selected = profileSelection.value;
    profileSelection.replaceChildren(new Option('Select a saved profile', ''));
    
    const lastConnection = preferences['lastDatabaseConnection'] as ConnectionDetails | null;
    if (lastConnection) profileSelection.add(new Option('Last Connection', '__last_connection__'));
    for (const profile of getProfiles()) profileSelection.add(new Option(profile.name, profile.name));
    
    profileSelection.value = [...profileSelection.options].some(option => option.value === selected) ? selected : '';
    updateProfileActions();
}

function updateProfileActions() {
    if (profileDeleteBtn) {
        profileDeleteBtn.disabled = !profileSelection?.value;
    }
}

function loadConnectionDetails(connection: ConnectionDetails) {
    if (connection.mode === 'url') {
        // Sanitize again in case an older preferences file was edited manually.
        if (urlInput) urlInput.value = sanitizeCustomURL(connection.url) || '';
    } else {
        if (prefixInput) prefixInput.value = connection.prefix;
        if (hostnameInput) hostnameInput.value = connection.hostname;
        if (portInput) portInput.value = connection.port;
        if (databaseInput) databaseInput.value = connection.database;
        if (usernameInput) usernameInput.value = connection.username;
        if (urlInput) urlInput.value = '';
    }
    if (passwordInput) passwordInput.value = '';
}

function loadSelectedProfile() {
    const selected = profileSelection?.value;
    if (!selected) return;
    const connection = selected === '__last_connection__'
    ? preferences['lastDatabaseConnection'] as ConnectionDetails | null
    : getProfiles().find(profile => profile.name === selected)?.connection;
    if (!connection) return;
    loadConnectionDetails(connection);
    notifications.show_notification('Connection profile loaded.');
}

async function saveProfile() {
    const name = profileNameInput?.value.trim() || '';
    const connection = currentConnectionDetails();
    if (!name) {
        notifications.show_notification('Enter a name for this connection profile.', 'warning');
        profileNameInput?.focus();
        return;
    }
    if (!connection) {
        notifications.show_notification('Enter a valid custom URL before saving this profile.', 'warning');
        return;
    }
    if (connection.mode === 'fields' && (!connection.hostname || !connection.database)) {
        notifications.show_notification('Enter a host and database before saving this profile.', 'warning');
        return;
    }
    
    const profiles = getProfiles().filter(profile => profile.name.toLocaleLowerCase() !== name.toLocaleLowerCase());
    profiles.push({ name, connection });
    await setPreference('databaseConnectionProfiles', profiles);
    renderProfiles();
    if (profileSelection) profileSelection.value = name;
    updateProfileActions();
    if (profileNameInput) profileNameInput.value = '';
    notifications.show_notification(`Saved connection profile “${name}”.`);
}

async function deleteSelectedProfile() {
    const selected = profileSelection?.value;
    if (!selected) return;
    
    if (selected === '__last_connection__') {
        await setPreference('lastDatabaseConnection', null);
        notifications.show_notification('Deleted "Last Connection" profile.');
    } else {
        await setPreference(
            'databaseConnectionProfiles', 
            getProfiles().filter(profile => profile.name !== selected)
        );
        notifications.show_notification(`Deleted connection profile “${selected}”.`);
    }
    
    renderProfiles();
}

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (typeof err === 'object' && err !== null && 'message' in err) {
        return String((err as { message: unknown }).message);
    }
    return 'An unknown error occurred.';
}

function setLoadingState(isLoading: boolean) {
    if (submitBtn) submitBtn.disabled = isLoading;
    if (urlSubmitBtn) urlSubmitBtn.disabled = isLoading;
    if (disconnectBtn) disconnectBtn.disabled = isLoading || !connected;
}

function isValidConnectionString(connectionString: string): boolean {
    try {
        const parsableUrl = connectionString.replace(/^(mysql|mariadb|sqlite):\/\//i, 'http://');
        new URL(parsableUrl);
        return true;
    } catch {
        return false;
    }
}

export function init() {
    if (isInitialized) return false;
    
    backBtn?.addEventListener('click', () => {
        tabs.goto('previous');
    });
    
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        connectDatabase();
    });
    
    urlSubmitBtn?.addEventListener('click', () => {
        const url = urlInput?.value?.trim() || '';
        connectDatabase(url);
    });
    
    disconnectBtn?.addEventListener('click', disconnectDatabase);
    if (saveLastProfileToggle) {
        saveLastProfileToggle.checked = Boolean(preferences['saveLastConnection']);
        saveLastProfileToggle.addEventListener('change', () => {
            void setPreference('saveLastConnection', saveLastProfileToggle.checked)
            .then(renderProfiles)
            .catch(error => console.error('Failed to save Last Connection preference:', error));
        });
    }
    profileSelection?.addEventListener('change', updateProfileActions);
    profileLoadBtn?.addEventListener('click', loadSelectedProfile);
    profileSaveBtn?.addEventListener('click', () => void saveProfile());
    profileDeleteBtn?.addEventListener('click', () => void deleteSelectedProfile());
    
    loadCSS('sheets/connect_database.css');
    isInitialized = true;
    renderProfiles();
    void syncConnectionState();
    return true;
}

/** Reflect the database selected by the Bun process after this view is loaded. */
async function syncConnectionState() {
    if (!electroview?.rpc?.request?.getDatabase) return;
    
    try {
        setLoadingState(true);
        const database = await electroview.rpc.request.getDatabase();
        connected = database === 'sql';
        
        if (!connected) {
            if (statusOutput) statusOutput.innerText = 'Not Connected';
            return;
        }
        
        const reachable = await electroview.rpc.request.pingServer();
        if (statusOutput) {
            statusOutput.innerText = reachable
            ? 'Connected to Database'
            : 'Database Connection Unavailable';
        }
    } catch (err) {
        connected = false;
        if (statusOutput) statusOutput.innerText = 'Connection Status Unavailable';
        console.warn('Failed to synchronize database connection state:', err);
    } finally {
        setLoadingState(false);
    }
}

async function connectDatabase(customURL?: string) {
    let target = '';
    
    if (!electroview?.rpc?.request?.setDatabase) {
        notifications?.show_notification('RPC Connection unavailable. Please restart the application.', 'error');
        return;
    }
    
    if (customURL) {
        target = customURL.trim();
        if (!target) {
            notifications?.show_notification('Please enter a valid connection URL.', 'warning');
            return;
        }
    } else {
        const prefix = prefixInput?.value?.trim() || 'mysql://';
        const hostname = hostnameInput?.value?.trim() || '';
        const port = portInput?.value?.trim() || '';
        const database = databaseInput?.value?.trim() || '';
        const username = usernameInput?.value?.trim() || '';
        const password = passwordInput?.value?.trim() || '';
        
        if (!hostname) {
            notifications?.show_notification('Please provide a host or IP address.', 'warning');
            hostnameInput?.focus();
            return;
        }
        
        if (!database) {
            notifications?.show_notification('Please specify a database name.', 'warning');
            databaseInput?.focus();
            return;
        }
        
        if (port) {
            const parsedPort = Number(port);
            if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
                notifications?.show_notification('Please enter a valid port number (1-65535).', 'warning');
                portInput?.focus();
                return;
            }
        }
        
        const encodedUser = encodeURIComponent(username);
        const encodedPass = encodeURIComponent(password);
        
        const auth = encodedUser ? (encodedPass ? `${encodedUser}:${encodedPass}@` : `${encodedUser}@`) : '';
        const portPart = port ? `:${port}` : '';
        const scheme = prefix.endsWith('://') ? prefix : `${prefix}://`;
        
        target = `${scheme}${auth}${hostname}${portPart}/${database}`;
    }
    
    if (!isValidConnectionString(target)) {
        notifications?.show_notification('Invalid connection URL format generated. Please check your inputs.', 'error');
        return;
    }
    
    try {
        setLoadingState(true);
        notifications?.show_notification('Attempting to connect to database...');
        if (statusOutput) statusOutput.innerText = 'Connecting to database...';
        
        await electroview.rpc.request.setDatabase({
            database: 'sql',
            databasePath: target
        });
        
        connected = true;
        const lastConnection = currentConnectionDetails();
        if (lastConnection && preferences['saveLastConnection']) {
            await setPreference('lastDatabaseConnection', lastConnection);
            renderProfiles();
        }
        notifications?.show_notification('Successfully connected to database!');
        if (statusOutput) statusOutput.innerText = 'Connected to Database';
        
        await select_space.populate_spaces_prompt();
    } catch (err) {
        connected = false;
        const message = getErrorMessage(err);
        notifications?.show_notification(`Failed to connect to database: ${message}`, 'error');
        if (statusOutput) statusOutput.innerText = 'Connection Failed';
    } finally {
        setLoadingState(false);
    }
}

async function disconnectDatabase() {
    if (!connected) {
        notifications?.show_notification("You aren't connected to a remote database.", 'warning');
        return;
    }
    
    if (!electroview?.rpc?.request?.setDatabase) {
        notifications?.show_notification('RPC Connection unavailable. Please restart the application.', 'error');
        return;
    }
    
    try {
        setLoadingState(true);
        notifications?.show_notification('Disconnecting from remote database...');
        if (statusOutput) statusOutput.innerText = 'Disconnecting...';
        
        await electroview.rpc.request.setDatabase({ database: 'sqlite' });
        
        connected = false;
        await select_space.populate_spaces_prompt();
        if (statusOutput) statusOutput.innerText = 'Not Connected';
        notifications?.show_notification('Disconnected from remote database. Switched to local SQLite.');
    } catch (err) {
        const message = getErrorMessage(err);
        notifications?.show_notification(`Failed to disconnect from remote database: ${message}`, 'error');
        if (statusOutput) statusOutput.innerText = 'Connected to Database';
    } finally {
        setLoadingState(false);
    }
}

window.addEventListener('tabchange', (event) => {
    const eventDetails = event as CustomEvent<TabChangeEventDetail>;
    const { tabId } = eventDetails.detail;
    if (tabId === 'connect_database') {
        if (!init()) void syncConnectionState();
    }
});
