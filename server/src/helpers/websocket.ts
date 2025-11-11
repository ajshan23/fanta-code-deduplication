import WebSocket from "ws";
import { EventPayload } from "../utils/types.js";
import { deduplicationHandle } from "./eventProcessor.js";
import { WS_URL, INSTANCE_ID } from "./config.js";

let reconnectAttempts = 0;
const maxReconnectDelay = 30000;
const baseReconnectDelay = 1000;

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
        reconnectWithBackoff();
    })
    ws.on("error", (err) => {
        console.log(`websocket error in ${INSTANCE_ID}`, err);
    });
}
function reconnectWithBackoff() {
    reconnectAttempts++;
    const delay = Math.min(
        baseReconnectDelay * Math.pow(2, reconnectAttempts - 1),
        maxReconnectDelay
    );

    console.log(`Attempting to reconnect in ${INSTANCE_ID}`);

    setTimeout(() => {
        console.log(`Reconnecting to WebSocket in ${INSTANCE_ID}...`);
        wsServerConnect();
    }, delay);
}

export { wsServerConnect };