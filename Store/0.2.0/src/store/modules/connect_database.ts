import { loadCSS } from "./file_loader.ts";
import * as tabs from './tabs.ts';
import * as notifications from './notifications.ts';
import * as select_space from './select_space.ts';

import { electroview } from "./index.ts";

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

const statusOutput = getEBD<HTMLSpanElement>('connect_database_status');
const disconnectBtn = getEBD<HTMLButtonElement>('connect_database_disconnect');

let isInitialized = false;
let connected = false;

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
    if (!isInitialized) {
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
        
        try {
            loadCSS('sheets/connect_database.css');
        } catch (err) {
            console.error('[Connect Database] Failed to load module stylesheet:', err);
        }

        isInitialized = true;
    }
    
    tabs.goto('connect_database', { logPrevious: true });
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
        notifications?.show_notification('Successfully connected to database!');
        if (statusOutput) statusOutput.innerText = 'Connected to Database';
        
        select_space.populate_spaces_prompt();
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
        select_space.populate_spaces_prompt();
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