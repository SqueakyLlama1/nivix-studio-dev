import { Electroview } from "electrobun/view";
import { type StoreRPCType } from '../../shared/bun/store_rpc_type';

import * as load from './load';
// Register tab listeners for the database screen (and its select-space dependency).
import './connect_database';

const rpc = Electroview.defineRPC<StoreRPCType>({
    handlers: {
        requests: {},
        messages: {},
    }
});
export const electroview = new Electroview({ rpc });

export const store = {
    "sessionVersion": "0.2.0"
}

load.checkLoadState();

export function quit() {
    window.close();
}
