import { Pool, PoolClient } from 'pg'


export default class SlidesDatabase {
	private pool: Pool;
	private schemaSetup = false;

	constructor({ url }: { url: string }) {
		this.pool = new Pool({
			connectionString: url,
			ssl: {
				rejectUnauthorized: false
			}
		})
	}

	async query(queryString: string, values?: any[]) {
		const client = await this.aquire()
		const results = await client.query(queryString, values)
		this.release(client)

		return results
	}

	private async initSchema(client: PoolClient) {
		await client.query(`
			CREATE TABLE IF NOT EXISTS slide_set (
				name varchar(256) NOT NULL,
				pdf_base64 text NOT NULL,
				PRIMARY KEY (name)
			);
		`)
		await client.query(`
			CREATE TABLE IF NOT EXISTS slide_page (
				slide_name varchar(256) NOT NULL,
				number integer NOT NULL,
				image_base64 text NOT NULL
			);
		`)
	}

	private async aquire() {
		const client = await this.pool.connect()
		if (!this.schemaSetup) {
			await this.initSchema(client)
			this.schemaSetup = true
		} 
		return client
	}

	private release(client: PoolClient) {
		client.release()
	}
}
