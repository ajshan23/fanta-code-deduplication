export const INSTANCE_ID = process.env.INSTANCE_ID;
export const PORT = process.env.PORT;
export const WS_URL = process.env.WS_URL || "ws://producer:8080";
export const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
export const DATABASE_URL = process.env.DATABASE_URL || "postgres://aju:aju123@postgres:5432/taskdb";