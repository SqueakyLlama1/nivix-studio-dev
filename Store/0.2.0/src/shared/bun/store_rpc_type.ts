import type { RPCSchema } from "electrobun";

export type StoreRPCType = {
    bun: RPCSchema<{
        requests: {
            needsConversion: {
                params: void;
                response: boolean | string;
            };
            getPreferences: {
                params: void;
                response: Record<string, any>;
            };
            setPreferences: {
                params: object;
                response: boolean;
            };
            createSpace: {
                params: string;
                response: any;
            };
            listSpaces: {
                params: void;
                response: any;
            };
            deleteSpace: {
                params: string;
                response: any;
            };
            createCategory: {
                params: {
                    name: string;
                    space: string;
                    category?: any;
                    fields?: any[];
                };
                response: any;
            };
            listCategories: {
                params: string;
                response: any;
            };
            deleteCategory: {
                params: string;
                response: any;
            };
            createItem: {
                params: {
                    name: string;
                    category: string;
                    quantity?: number;
                    attributes?: object;
                };
                response: any;
            };
            deleteItem: {
                params: string;
                response: any;
            };
            updateItem: {
                params: {
                    id: string;
                    updates?: object;
                };
                response: any;
            };
            listItemsByCategory: {
                params: string;
                response: any;
            };
            getItemById: {
                params: string;
                response: any;
            };
            queryItems: {
                params: {
                    category?: string | null;
                    rules?: any[];
                    logicalOp?: string;
                } | void;
                response: any;
            };
            rebuildSearchIndex: {
                params: void;
                response: any;
            };
            convert: {
                params: {
                    version: string;
                    space: string;
                };
                response: any;
            };
            readFile: {
                params: {
                    path: string;
                };
                response: string;
            }
        };
        messages: {};
    }>;
    webview: RPCSchema<{
        requests: {};
        messages: {};
    }>;
};