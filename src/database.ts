import redis, { RedisClient } from 'redis'
import { promisify } from 'util'


export default class RedisDatabase {
	private client: RedisClient;

	constructor({ url }: { url: string }) {
		this.client = redis.createClient({ url });
		this.client.on("error", function (error) {
			console.error(error);
		});
	}

	public get (key: string) {
		return promisify(this.client.get).bind(this.client)(key)
	}

	public set (key: string, value: string) {
		return promisify(this.client.set).bind(this.client)(key, value)
	}

	public hget (hash: string, key: string) {
		return promisify(this.client.hget).bind(this.client)(hash, key)
	}

	public hset (hash: string, key: string, value: string) { 
		return promisify<string, string, string, number>(this.client.hset).bind(this.client)(hash, key, value)
	}

	public hgetall (hash: string) {
		return promisify(this.client.hgetall).bind(this.client)(hash)
	}

	public hkeys (hash: string) {
		return promisify(this.client.hkeys).bind(this.client)(hash)
	}

	public hdel (hash: string, keys: string[]) {
		return promisify<string, string[], number>(this.client.hdel).bind(this.client)(hash, keys)
	}

	async hdelall(hash: string) {
		const keys = await this.hkeys(hash)
		if (keys.length === 0) return 0;
		return this.hdel(hash, keys)
	}
}
