import express from "express";
import { initDB, getRecentEvents } from "./helpers/db.js";
import { wsServerConnect } from "./helpers/websocket.js";

const INSTANCE_ID = process.env.INSTANCE_ID;
const PORT = process.env.PORT;

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.send(`Instance ${INSTANCE_ID} is running with WS`);
});

app.get("/api/events", async (req, res) => {
    const rows = await getRecentEvents();
    res.json(rows);
});

//IIFE function call
(async () => {
    await initDB().then(() => {
        app.listen(PORT);
        wsServerConnect();
    })
})();