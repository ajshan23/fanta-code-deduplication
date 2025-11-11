import express from "express";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3005;
const WSPORT = 8080;

const wss = new WebSocketServer({ port: WSPORT }, () => {
  console.log(` Producer WS running on ${WSPORT}`);
});

wss.on("connection", (socket) => {
  console.log("Listener connected to producer");
  socket.on("close", () => console.log("Listener disconnected"));
});

function broadcast(event) {
  const payload = JSON.stringify(event);
  let sent = 0;
  wss.clients.forEach((c) => {
    if (c.readyState === 1) {
      c.send(payload);
      sent++;
    }
  });
  console.log(`Broadcast event ${event.event_id} to ${sent} listeners`);
}

//for test
app.post("/publish", (req, res) => {
  const event = req.body;
  if (!event || !event.event_id) {
    return res.status(400).json({ error: "event_id required in body" });
  }
  broadcast(event);
  return res.json({ ok: true, sentTo: wss.clients.size });
});

app.listen(PORT, () => {
  console.log(`Producer running on port `,PORT);
});
