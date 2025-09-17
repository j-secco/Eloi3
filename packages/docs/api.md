# API Documentation

This document provides a detailed guide to using the UR10 Robot Server API, including authentication, rate limiting, and error handling.

## Base URL

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://your-domain.com/api/v1`

## Authentication

The API uses token-based authentication. Include your API token in the `Authorization` header:

```
Authorization: Bearer <your-api-token>
```

## Rate Limiting

The API is rate-limited to prevent abuse. The default rate limit is 100 requests per minute. If you exceed the rate limit, you will receive a `429 Too Many Requests` response.

## Endpoints

### Robot Control

- `POST /robot/move`: Move the robot to a specific position.
- `POST /robot/home`: Move the robot to the home position.
- `GET /robot/status`: Get the current robot status.

### Chess Game

- `POST /chess/new-game`: Start a new chess game.
- `POST /chess/move`: Make a chess move.
- `GET /chess/game`: Get the current game state.

For a complete list of endpoints and their parameters, please see the [OpenAPI Specification](./openapi.yaml).


