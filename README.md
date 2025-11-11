# Distributed Event Deduplication System

A WebSocket-based event processing system with Redis deduplication across multiple listener instances.

## Problem Statement

Multiple listener instances receive the same events over WebSocket. Need to ensure each event is processed exactly once across all instances.

## Solution Overview

Uses Redis as a distributed lock to coordinate which instance processes each event. Winner processes and stores in PostgreSQL, losers skip.

```
Producer (WebSocket) → Listener A, B, C... → Redis (Lock) → PostgreSQL
```

## Architecture

**Producer**: Broadcasts events via WebSocket to all listeners

**Listeners**: Multiple instances that:
- Receive events via WebSocket
- Try to claim event using Redis SET NX
- Process if claim succeeds
- Store in PostgreSQL

**Redis**: Distributed locking with 30s TTL

**PostgreSQL**: Persistent storage with unique constraint on event_id

## How Deduplication Works

```typescript
async function deduplicationHandle(event) {
    // Try to claim event atomically
    const claimed = await redis.set(
        `event:${event.event_id}`,
        INSTANCE_ID,
        "PX", 30000,  // 30 second TTL
        "NX"          // Only if not exists
    );
    
    if (claimed !== "OK") {
        console.log("Duplicate - another instance claimed this");
        return;
    }
    
    try {
        // Process event (simulate expensive operation)
        await processEvent(event);
        
        // Store in database
        await insertToDB(event);
    } finally {
        // Release lock
        await redis.del(`event:${event.event_id}`);
    }
}
```

## Key Design Choices

**Redis SET NX**: Atomic operation ensures only one instance can claim an event

**30s TTL**: If instance crashes, lock expires and event can be reprocessed

**PostgreSQL PRIMARY KEY**: Database-level duplicate protection as safety net

**ON CONFLICT DO NOTHING**: Silently ignore duplicates at DB level

## Failure Handling

**Instance crashes after claiming**: Lock expires in 30s, another instance can retry

**Redis down**: All processing stops, resumes when Redis is back

**Database down**: Retries with backoff, lock expires if retries fail

**Network issues**: Operations fail, lock expires automatically

## Setup

```bash
docker-compose down -v
```

```bash
docker-compose pull
```

```bash
docker-compose up
```

This starts:
- Producer on port 3005 (WebSocket on 8080)
- Listener A on port 3000
- Listener B on port 3001
- Redis on port 6379
- PostgreSQL on port 5432

## Testing Deduplication

Send an event to producer:

```bash
curl -X POST http://localhost:3005/publish \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-123",
    "payload": {"message": "hello"}
  }'
```

Check logs - you'll see:
- Both listeners receive the event
- One claims and processes
- Other detects duplicate and skips

View stored events:

```bash
curl http://localhost:3000/api/events
```

## Scaling

**Adding more listeners**: Just add more services in docker-compose

**Redis**: Can use Redis Cluster for higher throughput

**PostgreSQL**: Can add read replicas for /api/events endpoint

**Producer**: Can run multiple producers behind a load balancer

**Message Queue Integration (for very high load) (future)**:  
If event traffic increases significantly,we can  integrate a **message broker** like **Kafka** or **RabbitMQ** between the producer and listeners.  
This allows:
- Buffered message handling (preventing listener overload)
- Reliable retry and ordering mechanisms  
- High throughput and horizontal scalability  

## Files Structure

```
project/
├── docker-compose.yml
├── producer/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
└── server/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── utils/types.ts
        └── helpers/
            ├── config.ts
            ├── websocket.ts
            ├── redis.ts
            ├── eventProcessor.ts
            └── db.ts
```

## Consistency Guarantees

Aiming for **exactly-once processing**:
- Redis ensures atomic claim (at-most-once)
- TTL allows retries on failure (at-least-once delivery)
- Database constraint prevents duplicate storage

In practice: exactly-once under normal conditions, at-least-once on failures (safe side)

## Monitoring

Watch the logs to see:
- Which instance claims each event
- Duplicate detections
- Processing confirmations
- Database persistence

Each instance logs with its INSTANCE_ID for easy tracking.




made readme using an ai called claude.ai