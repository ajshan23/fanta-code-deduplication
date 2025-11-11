import Redis from "ioredis";
import { REDIS_URL, INSTANCE_ID } from "./config.js";

const redis = new Redis(REDIS_URL);

async function tryRedisClaim(eId: string) {
   return await redis.set(`event:${eId}`, INSTANCE_ID!, "PX", 30000, "NX");
    //used set instead of hmap for indivisual TTL
}

async function releaseRedisLock(eId: string) {
    await redis.del(`event:${eId}`);
}

export { redis, tryRedisClaim, releaseRedisLock };