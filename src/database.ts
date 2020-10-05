import redis from 'redis'
import { print } from 'util';


export default class RedisDatabase {
    private client: redis.RedisClient

    constructor({ url } : { url: string }){
        this.client = redis.createClient({ url });
        this.client.on("error", function(error) {
            console.error(error);
        });
    }

    async hget(hash: string, key: string) : Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.hget(hash, key, (error, result) => {
                if (error) reject(error)
                else resolve(result)
            })
        });
    }

    async hset(hash:string, key: string, value: string) {
        return new Promise((resolve, reject) => {
            this.client.hset(hash, key, value, (error) => {
                if (error) reject(error)
                else resolve()
            })
        })
    }

    async set(key: string, value: string) {
        return new Promise((resolve, reject) => {
            this.client.set(key, value, (error) => {
                if (error) reject(error)
                else resolve()
            })
        })
    }

    async get(key: string) : Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.get(key, (error, result) => {
                if (error) reject(error)
                else resolve(result)
            })
        })
    }

    async hgetall(hash: string) : Promise<{[key: string]: string}>{
        return new Promise((resolve, reject) => {
            this.client.hgetall(hash, (error, result) => {
                if (error) reject(error)
                else resolve(result)
            });
        });
    }
}
