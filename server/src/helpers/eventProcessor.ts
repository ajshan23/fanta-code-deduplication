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

    let retries = 3;
    let lastError;

    while (retries > 0) {
        try {
            await processEvent(event);
            await releaseRedisLock(eventId);
            return;//once completed exists , if not retries
        } catch (error) {
            lastError = error;
            retries--;
            console.error(`processing failed for event ${eventId} at ${INSTANCE_ID}, retries left: ${retries}`, error);
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 2000));//2 sec
            }
        }
    }

    await releaseRedisLock(eventId);
    console.error(`Event ${eventId} failed after all retries in ${INSTANCE_ID}`);

}

async function processEvent(event: EventPayload) {
    console.log(`event processing started for event ${event.event_id} at ${INSTANCE_ID}`);
    await new Promise(r => setTimeout(r, 1000)) // this process can be image compressoin,video transacription ,llm calls or any lind of calls that consume time and resource
    //store to db
    await insertToDB(event);
    console.log(`persisted ${event.event_id} in instance ${INSTANCE_ID}`);
}

export { deduplicationHandle };