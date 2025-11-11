import WebSocket from "ws";
import { EventPayload } from "../utils/types.js";
import { deduplicationHandle } from "./eventProcessor.js";
import { WS_URL, INSTANCE_ID } from "./config.js";

async function wsServerConnect() {
    const ws = new WebSocket(WS_URL);
    ws.on("open", () => {
        console.log(`Connect to frontend in ${INSTANCE_ID}`);
    });
    ws.on("message", async (data) => {
        try {
            const event: EventPayload = JSON.parse(data.toString());
            console.log(`Recieved event ${event.event_id} in ${INSTANCE_ID}`);
            await deduplicationHandle(event);
        } catch (error) {
            console.error(`Error occured at ${INSTANCE_ID}`, error);
        }
    });
    ws.on("close", () => {
        console.log(`disconnected to frontend in ${INSTANCE_ID}`);
    })
    ws.on("error", (err) => {
        console.log(`websocket error in ${INSTANCE_ID}`, err);
    });
}

export { wsServerConnect };