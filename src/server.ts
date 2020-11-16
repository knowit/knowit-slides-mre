import { Permissions, WebHost } from '@microsoft/mixed-reality-extension-sdk';
import { resolve as resolvePath } from 'path';
import App from './app';
import HttpServer from './http'
import Database from './database'

/* eslint-disable no-console */
process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));
/* eslint-enable no-console */

const baseUrl = process.env['BASE_URL'] || undefined
const databaseUrl = process.env['DATABASE_URL']


const waitFor = (condition: () => boolean) => {
	return new Promise((resolve) => {
		const awaitCondition = () => {
			if (condition()) {
				resolve()
			} else {
				setTimeout(awaitCondition, 100)
			}
		}
		awaitCondition();
	})
}

function runApp() {
	const databaseService = new Database({ url: databaseUrl });

	const server = new WebHost({
		baseUrl,
		baseDir: resolvePath(__dirname, '../public'),
		optionalPermissions: [
			Permissions.UserInteraction
		]
	});
	server.adapter.onConnection(
		context => new App(context, databaseService, server.baseUrl));

	// Workaround to use same web server context
	waitFor(() => !!server.adapter.server)
		.then(() => new HttpServer(server.adapter.server, databaseService))
}

const delay = 1000;
const argv = process.execArgv.join();
const isDebug = argv.includes('inspect') || argv.includes('debug');

if (isDebug) {
	setTimeout(runApp, delay);
} else {
	runApp();
}
