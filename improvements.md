# 💡 Improvements for Whispr Backend

---

## 🔒 Security

### 1. Use Environment-Aware Cookie `secure` Flag

All services hardcode `secure: false` on cookies. Use `process.env.NODE_ENV === "production"` to set it dynamically.

```typescript
res.cookie("accessToken", token, {
  secure: process.env.NODE_ENV === "production",
  // ...
});
```

### 2. Use Separate JWT Secrets for Access & Refresh Tokens

Both `generateAccessToken` and `generateRefreshToken` use the same `JWT_SECRET_KEY`. A leaked access token secret would also compromise refresh tokens. Use `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

### 3. Make `accessToken` Cookie `httpOnly`

Currently `httpOnly: false`, exposing the access token to XSS. If the frontend reads it from the cookie, consider a different approach (e.g., return it in the response body and use `httpOnly: true` for the refresh token only).

### 4. Add Authentication to SSE Notifications Endpoint

`getNotificationEvent` accepts `userId` from `req.query` without any auth check. Add `authenticateRequest` middleware and use `req.userId` instead.

### 5. Validate and Sanitize Google OAuth `redirect_uri`

The Google OAuth redirect URI is hardcoded to `http://localhost:3006`. Use an environment variable so it works in production.

---

## 🏗️ Architecture & Code Quality

### 6. Extract Duplicated Code into Shared Packages

CORS config, auth middleware, error handlers, Redis setup, rate limiters, and loggers are duplicated across all services. Create a shared `@whispr/common` package with:

- Auth middleware
- Error handler
- Logger factory
- Redis client factory
- CORS config factory

### 7. Move Business Logic Out of Controllers

Controllers like `message.controller.ts` (873 lines) contain all business logic. Extract it into service layer classes (the empty `message.service.ts` file suggests this was planned).

### 8. Fix Module-Level `session` Variables

In `user.controller.ts` and `chat-service/eventHandler.ts`, MongoDB sessions are declared at module scope, creating race conditions. Scope them inside the function.

### 9. Centralize Redis Key Naming

Redis keys are inconsistently formatted (`userChats:${id}` vs `userChats${id}`, `permittedChats${id}` with no separator). Create a utility:

```typescript
export const redisKeys = {
  userChats: (id: string) => `userChats:${id}`,
  permittedChats: (id: string) => `permittedChats:${id}`,
  permissions: (id: string) => `permissions:${id}`,
  currentChat: (id: string) => `currentChat:${id}`,
};
```

---

## ⚡ Caching & Performance

### 10. Add TTL to User Cache

`getCurrentUser` caches the user indefinitely (`redisClient.set` with no `EX`). Add a TTL to avoid stale data:

```typescript
await redisClient.set(`user:${userId}`, JSON.stringify(currentUser), "EX", 300);
```

### 11. Add TTL to Permissions Cache

`fetchPermissions` loads user permissions into Redis Sets with no expiry. These should have a reasonable TTL (e.g., 1 hour) to avoid unbounded memory growth.

### 12. Add TTL to `userChats` Cache

`getUserChats` caches without expiry. Add a TTL (e.g., 5-10 minutes).

### 13. Batch Friend Lookups in `getFriends`

Currently makes N individual `User.findById()` queries. Use a single `User.find({ _id: { $in: friendIds } })` for an O(1) database call instead of O(N).

### 14. Batch Unread Message Counts in `getUserChats`

Each chat triggers an individual `Message.countDocuments()` query. Use aggregation pipeline or `$in` to batch these.

---

## 🧯 Error Handling

### 15. Stop Sending Raw Error Objects in Responses

Multiple controllers return `res.status(500).json({ message: error })` where `error` is the raw Error object. This leaks stack traces and internal details. Always return sanitized messages:

```typescript
res.status(500).json({ success: false, message: "Internal server error" });
```

### 16. Consistent Error Response Schema

Some handlers return `{ message: ... }`, others `{ error: ... }`, and some `{ success: false, message: ... }`. Standardize all error responses:

```typescript
{ success: false, message: string, details?: string }
```

### 17. Add `return` After Error Responses in Auth Middleware

In `user-service/authenticateRequest.ts`, if `decodedToken` is falsy but no error was thrown, the middleware silently hangs without calling `next()` or responding. Add an `else` clause.

---

## 📊 Observability

### 18. Remove `console.log` / `console.error` in Favor of Logger

Many files mix `console.log` / `console.error` with the `pino` logger (e.g., `message.controller.ts` line 750, `user.controller.ts` line 12, `cluster.ts` line 77). Use the structured logger consistently.

### 19. Add Request IDs for Distributed Tracing

With 6 microservices, debugging cross-service issues requires correlating requests. Add a `requestId` (e.g., UUID) middleware and pass it through RabbitMQ messages and proxy headers.

### 20. Add Health Check Endpoints to All Services

Only `friend-service` has `/health` and `/ping` endpoints. Add these to all services for Docker healthchecks and load balancer readiness checks.

---

## 🐳 Docker & Infrastructure

### 21. Add Docker `healthcheck` Directives

The `docker-compose.yml` doesn't define `healthcheck` for any service. Add health checks to ensure `depends_on` actually waits for service readiness:

```yaml
chat-service:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
    interval: 30s
    retries: 3
```

### 22. Add Restart Policies

No `restart` policy is defined. Add `restart: unless-stopped` to all services.

### 23. Put Notification Service in Docker Compose Dependencies

The `notification-service` in docker-compose doesn't depend on `rabbitmq`, but it consumes RabbitMQ events. Add `depends_on: [rabbitmq, redis]`.

---

## 🌐 API Design

### 24. Use Correct HTTP Status Codes

- `updateUserInfo` returns `201 Created` for an update — should be `200 OK`
- `removeMemberFromGroup` returns `201 Created` — should be `200 OK`
- `401 Unauthorized` is used where `403 Forbidden` would be more appropriate (e.g., "you're not the admin")

### 25. Add Input Validation to More Endpoints

Several endpoints lack request body validation (e.g., `updateGroupDetails`, `resetPassword` relies on middleware but doesn't validate password strength rules).

### 26. Use `PATCH` Instead of `PUT` for Partial Updates

`updateUserInfo` and `updateGroupDetails` perform partial updates (only modify provided fields), which semantically should use `PATCH` rather than `PUT`.
