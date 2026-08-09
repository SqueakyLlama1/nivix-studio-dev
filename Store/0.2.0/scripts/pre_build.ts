import { cpSync } from "node:fs";

cpSync("src/shared/sheets", "src/store/sheets", { recursive: true });
cpSync("src/shared/sheets", "src/updater/sheets", { recursive: true });