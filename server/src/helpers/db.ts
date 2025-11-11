import pgpackage from "pg";
import { DATABASE_URL } from "./config.js";
import { EventPayload } from "../utils/types.js";

const { Pool } = pgpackage;
const dbpool = new Pool({ connectionString: DATABASE_URL });

// Initialize DB table
async function initDB() {
    await dbpool.query(`
    CREATE TABLE IF NOT EXISTS events_table (event_id TEXT PRIMARY KEY, payload JSONB, processed_at TIMESTAMP DEFAULT NOW());
  `);
    console.log(`Database ready`);
    //   schema 
    // event_id => text primary key
    // payload => the event data object
    //processed at =>Timestamp when the event was stored 
}
async function waitForDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await dbpool.query("SELECT 1;");
      console.log("Database is reachable");
      return;
    } catch (err) {
      console.log(`Waiting for database... (${i + 1} :${retries})`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error(" Database not reachable after retries");
}

async function insertToDB(payload: EventPayload) {
    await waitForDB()
    await dbpool.query(
        `INSERT INTO events_table (event_id, payload)
        VALUES ($1, $2)
        ON CONFLICT (event_id) DO NOTHING;
        `,
        [payload.event_id, payload.payload]
    )
}

async function getRecentEvents() {
    const { rows } = await dbpool.query(
        "SELECT * FROM events_table ORDER BY processed_at DESC LIMIT 10;"
    );
    return rows;
}

export { dbpool, initDB, insertToDB, getRecentEvents };