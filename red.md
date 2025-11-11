# Event Processing System with Fault Tolerance

A distributed event processing system with WebSocket communication, Redis-based deduplication, and PostgreSQL persistence. Built with fault tolerance mechanisms to ensure reliability.

## Architecture

- **Producer**: WebSocket server that broadcasts events
- **Listeners**: Multiple consumer instances that process events
- **Redis**: Distributed locking for deduplication
- **PostgreSQL**: Event persistence

## Fault Tolerance Features

### 1. **Application Startup Resilience**
- 3 retry attempts for app initialization
- Graceful shutdown if all retries fail
- 3s delay between retries

### 2. **Database Fault Tolerance**
- Initial health check with 10 retries (3s intervals)
- 3 retry attempts for insert operations (2s delays)
- Graceful degradation for read operations

### 3. **Redis Fault Tolerance**
- Connection monitoring (error, connect, ready events)
- Graceful degradation: processes events even if Redis fails
- Warning logs for duplicate risk when Redis is down
- Safe lock release with error handling

### 4. **Event Processing Retry Logic**
- 3 retry attempts per event (2s delays)
- Maintains Redis lock during retries
- Only logs to dead-letter queue after all retries fail

### 5. **WebSocket Auto-Reconnection**
- Exponential backoff reconnection strategy
- Base delay: 1 second
- Max delay: 30 seconds
- Resets counter on successful connection

### 6. **Dead Letter Queue**
- Failed events logged to `failed_events.log`
- Includes: event data, error message, instance ID, timestamp
- Enables manual recovery or debugging

## Retry Flow

```
Event Received
    ↓
Redis Deduplication Check
    ↓
┌─────────────────────────────┐
│ Event Processing (Retry 1) │
│  - Business Logic           │
│  - DB Insert (3 retries)    │
└─────────────────────────────┘
    ↓ (if fails)
┌─────────────────────────────┐
│ Event Processing (Retry 2) │
│  - Wait 2s                  │
│  - Business Logic           │
│  - DB Insert (3 retries)    │
└─────────────────────────────┘
    ↓ (if fails)
┌─────────────────────────────┐
│ Event Processing (Retry 3) │
│  - Wait 2s                  │
│  - Business Logic           │
│  - DB Insert (3 retries)    │
└─────────────────────────────┘
    ↓ (if fails)
Log to failed_events.log
```

## Setup

### Prerequisites
- Docker
- Docker Compose

### Environment Variables
```env
INSTANCE_ID=listener-a
PORT=3001
WS_URL=ws://producer:8080
REDIS_URL=redis://redis:6379
DATABASE_URL=postgres://aju:aju123@postgres:5432/taskdb
```

## Running the System

### 1️⃣ Start All Services
```bash
docker-compose up --build
```

### 2️⃣ Send Test Events
Open the producer in your browser or use a WebSocket client:
```
http://localhost:8080
```

### 3️⃣ Check Logs
Monitor logs for each service:
```bash
docker logs -f fantacode-producer
docker logs -f fantacode-listenera
docker logs -f fantacode-listenerb
```

### 4️⃣ View Recent Events
```bash
curl http://localhost:3001/api/events
curl http://localhost:3002/api/events
```

### 5️⃣ Check Failed Events
```bash
# Inside listener container
docker exec -it fantacode-listenera cat failed_events.log
docker exec -it fantacode-listenerb cat failed_events.log
```

## Monitoring

### Successful Processing
```
✅ Connected to frontend in listener-a
✅ Recieved event evt_123 in listener-a
✅ event processing started for event evt_123 at listener-a
✅ persisted evt_123 in instance listener-a
```

### Deduplication
```
⚠️ Duplicate event evt_123 at listener-b
```

### Retry Scenarios
```
❌ Processing failed for event evt_456 at listener-a, retries left: 2
❌ DB insert failed for evt_456, retries left: 2
✅ persisted evt_456 in instance listener-a (after retry)
```

### WebSocket Reconnection
```
❌ Disconnected from frontend in listener-a
🔄 Attempting to reconnect in 1000ms (attempt 1) in listener-a
🔄 Reconnecting to WebSocket in listener-a...
✅ Connected to frontend in listener-a
```

### Failed Events (Dead Letter)
```
❌ Event evt_789 failed after all retries in listener-a
📝 Logged failed event evt_789 to failed_events.log
```

## Testing Fault Tolerance

### Test Database Failure
```bash
# Stop database
docker-compose stop postgres

# Send events - should see retries
# Restart database
docker-compose start postgres

# Events should eventually process
```

### Test Redis Failure
```bash
# Stop Redis
docker-compose stop redis

# Send events - should process with duplicate risk warning
# Restart Redis
docker-compose start redis
```

### Test WebSocket Disconnection
```bash
# Stop producer
docker-compose stop producer

# Listeners should attempt reconnection with backoff
# Restart producer
docker-compose start producer

# Listeners should reconnect automatically
```

## Error Recovery

### Manual Recovery from Dead Letter Queue
```bash
# Extract failed events
docker exec fantacode-listenera cat failed_events.log

# Replay events manually via producer or API
```

## Configuration

### Adjust Retry Counts
Edit retry values in code:
- App initialization: 3 retries (`index.ts`)
- Event processing: 3 retries (`eventProcessor.ts`)
- Database inserts: 3 retries (`db.ts`)
- Database initial check: 10 retries (`db.ts`)

### Adjust Retry Delays
- Event processing: 2000ms (`eventProcessor.ts`)
- Database inserts: 2000ms (`db.ts`)
- Database initial check: 3000ms (`db.ts`)
- WebSocket reconnect: 1s to 30s exponential (`websocket.ts`)

## Production Considerations

1. **Dead Letter Queue**: Consider using a proper DLQ service (AWS SQS, RabbitMQ)
2. **Monitoring**: Add metrics for retry counts and failure rates
3. **Alerting**: Set up alerts for high failure rates
4. **Log Aggregation**: Use ELK stack or similar for centralized logging
5. **Health Checks**: Implement `/health` endpoints for orchestration
6. **Circuit Breakers**: Consider adding circuit breakers for external services

## Troubleshooting

### Events Not Processing
1. Check database connectivity
2. Check Redis connectivity
3. Check WebSocket connection
4. Review `failed_events.log`

### High Duplicate Warnings
- Redis might be down or unstable
- Check Redis logs: `docker logs fantacode-redis`

### Events Stuck in Processing
- Check if instances are competing for locks
- Verify Redis TTL is appropriate (30s default)

## License
MIT