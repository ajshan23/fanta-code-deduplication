import { EventPayload } from "../utils/types.js";
import { tryRedisClaim, releaseRedisLock } from "./redis.js";
import { insertToDB } from "./db.js";
import { INSTANCE_ID } from "./config.js";

async function deduplicationHandle(event: EventPayload) {
    const eventId = event.event_id;
    const claimSlot = await tryRedisClaim(eventId);
    if (claimSlot !== "OK") {
        console.log(`Duplicate event ${eventId} at ${INSTANCE_ID}`);
        return;
    }
    try {
        await processEvent(event);
    } catch (error) {
        console.error(`Error occured while processing event ${eventId} at ${INSTANCE_ID}`, error);
    } finally {
        await releaseRedisLock(eventId);
    }
}

async function processEvent(event: EventPayload) {
    console.log(`event processing started for event ${event.event_id} at ${INSTANCE_ID}`);
    await new Promise(r => setTimeout(r, 1000)) // this process can be image compressoin,video transacription ,llm calls or any lind of calls that consume time and resource
    //store to db
    await insertToDB(event);
    console.log(`persisted ${event.event_id} in instance ${INSTANCE_ID}`);
}

export { deduplicationHandle };