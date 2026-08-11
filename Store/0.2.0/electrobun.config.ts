import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "nivix-store",
		identifier: "store.nivixtech.com",
		version: "0.2.0",
	},
	scripts: {
		preBuild: "scripts/pre_build.ts"
	},
	build: {
		bun: {
			entrypoint: "src/bun/index.ts"
		},
		views: {
			store: {
				entrypoint: "src/store/modules/index.ts",
			},
			updater: {
				entrypoint: "src/updater/modules/index.ts"
			}
		},
		copy: {
			"src/store": "views/store",
			"src/updater": "views/updater"
		},
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
			icon: "src/assets/favicon.ico"
		},
	},
} satisfies ElectrobunConfig;