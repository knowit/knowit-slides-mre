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
	const awaitServerSetup = () => {
		if(server.adapter.server) {
			new HttpServer(
				server.adapter.server, 
				database)
		} else {
			setTimeout(awaitServerSetup, 1000)
		}
	}
	awaitServerSetup();
}

const delay = 1000;
const argv = process.execArgv.join();
const isDebug = argv.includes('inspect') || argv.includes('debug');

if (isDebug) {
	setTimeout(runApp, delay);
} else {
	runApp();
}
