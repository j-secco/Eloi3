# WebSocket Documentation

This document describes the WebSocket interface for the UR10 Robot Server, which provides real-time telemetry and event notifications.

## Connection URL

- **Development**: `ws://localhost:8000/ws`
- **Production**: `wss://your-domain.com/ws`

## Subscribing to Topics

To receive messages, you must subscribe to one or more topics. Send a JSON message with the following format:

```json
{
  "action": "subscribe",
  "topic": "robot-status"
}
```

### Available Topics

- `robot-status`: Real-time updates on robot position, joint angles, and status.
- `chess-game`: Updates on chess game state, moves, and events.
- `system-health`: System health metrics, including CPU, memory, and disk usage.

## Message Format

All messages from the server are in JSON format. The message format depends on the topic.

### Robot Status Message

```json
{
  "topic": "robot-status",
  "data": {
    "position": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    "joint_angles": [1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
    "status": "idle"
  }
}
```

## Heartbeat

The server will send a ping message every 30 seconds to keep the connection alive. Your client should respond with a pong message.


