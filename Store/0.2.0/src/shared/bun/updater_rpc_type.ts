import type { RPCSchema } from "electrobun";

export type UpdaterRPCType = {
    bun: RPCSchema<{
        requests: {
            checkUpdate: {
                params: void;
                response: boolean;
            };
            storeHandoff: {
                params: void;
                response: void;
            };
            close: {
                params: void;
                response: void;
            };
        };
        messages: {};
    }>;
    webview: RPCSchema<{
        requests: {};
        messages: {
            displayDebug: {
                message: string;
                type?: string;
            };
        };
    }>;
};