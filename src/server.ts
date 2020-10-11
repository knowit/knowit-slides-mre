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
const url = process.env['REDIS_URL']

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
	const database = new Database({ url });
	const server = new WebHost({
		baseUrl,
		baseDir: resolvePath(__dirname, '../public'),
		optionalPermissions: [
			Permissions.UserInteraction
		]
	});
	server.adapter.onConnection(
		context => new App(context, database, server.baseUrl));

	// Workaround to use same web server context
	waitFor(() => !!server.adapter.server)
		.then(() => new HttpServer(server.adapter.server, database))
}

const delay = 1000;
const argv = process.execArgv.join();
const isDebug = argv.includes('inspect') || argv.includes('debug');

if (isDebug) {
	setTimeout(runApp, delay);
} else {
	runApp();
}
