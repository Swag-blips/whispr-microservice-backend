# 💡 Improvements for Whispr Backend

---

## 🔒 Security

### 1. Use Separate JWT Secrets for Access & Refresh Tokens

Both `generateAccessToken` and `generateRefreshToken` use the same `JWT_SECRET_KEY`. A leaked access token secret would also compromise refresh tokens. Use `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

### 3. Validate and Sanitize Google OAuth `redirect_uri`

The Google OAuth redirect URI is hardcoded to `http://localhost:3006`. Use an environment variable so it works in production.

---

## 🏗️ Architecture & Code Quality

### 4. Extract Duplicated Code into Shared Packages

CORS config, auth middleware, error handlers, Redis setup, rate limiters, and loggers are duplicated across all services. Create a shared `@whispr/common` package with:

- Auth middleware
- Error handler
- Logger factory
- Redis client factory
- CORS config factory

### 5. Move Business Logic Out of Controllers

Controllers like `message.controller.ts` (873 lines) contain all business logic. Extract it into service layer classes (the empty `message.service.ts` file suggests this was planned).

### 6. Fix Module-Level `session` Variables

In `user.controller.ts` and `chat-service/eventHandler.ts`, MongoDB sessions are declared at module scope, creating race conditions. Scope them inside the function.

### 7. Centralize Redis Key Naming

Redis keys are inconsistently formatted (`userChats:${id}` vs `permittedChats${id}` with no separator). Create a utility:

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

### 9. Add TTL to Permissions Cache

`fetchPermissions` loads user permissions into Redis Sets with no expiry. These should have a reasonable TTL (e.g., 1 hour) to avoid unbounded memory growth.

### 11. Batch Friend Lookups in `getFriends`

Currently makes N individual `User.findById()` queries. Use a single `User.find({ _id: { $in: friendIds } })` for an O(1) database call instead of O(N).

### 12. Batch Unread Message Counts in `getUserChats`

Each chat triggers an individual `Message.countDocuments()` query. Use aggregation pipeline or `$in` to batch these.

---

## 🧯 Error Handling

### 13. Stop Sending Raw Error Objects in Responses

Multiple controllers return `res.status(500).json({ message: error })` where `error` is the raw Error object. This leaks stack traces and internal details. Always return sanitized messages:

```typescript
res.status(500).json({ success: false, message: "Internal server error" });
```

### 14. Consistent Error Response Schema

Some handlers return `{ message: ... }`, others `{ error: ... }`, and some `{ success: false, message: ... }`. Standardize all error responses:

```typescript
{ success: false, message: string, details?: string }
```

### 15. Add `return` After Error Responses in Auth Middleware

In `user-service/authenticateRequest.ts`, if `decodedToken` is falsy but no error was thrown, the middleware silently hangs without calling `next()` or responding. Add an `else` clause.

---

## 📊 Observability

### 16. Remove `console.log` / `console.error` in Favor of Logger

Many files mix `console.log` / `console.error` with the `pino` logger (e.g., `message.controller.ts` line 750, `user.controller.ts` line 12, `cluster.ts` line 77). Use the structured logger consistently.

### 17. Add Request IDs for Distributed Tracing

With 6 microservices, debugging cross-service issues requires correlating requests. Add a `requestId` (e.g., UUID) middleware and pass it through RabbitMQ messages and proxy headers.

### 18. Add Health Check Endpoints to All Services

Only `friend-service` has `/health` and `/ping` endpoints. Add these to all services for Docker healthchecks and load balancer readiness checks.

---

## 🐳 Docker & Infrastructure

### 19. Add Docker `healthcheck` Directives

The `docker-compose.yml` doesn't define `healthcheck` for any service. Add health checks to ensure `depends_on` actually waits for service readiness:

```yaml
chat-service:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
    interval: 30s
    retries: 3
```

### 20. Add Restart Policies

No `restart` policy is defined. Add `restart: unless-stopped` to all services.

---

## 🌐 API Design

### 21. Use Correct HTTP Status Codes

- `updateUserInfo` returns `201 Created` for an update — should be `200 OK`
- `removeMemberFromGroup` returns `201 Created` — should be `200 OK`
- `401 Unauthorized` is used where `403 Forbidden` would be more appropriate (e.g., "you're not the admin")

### 22. Add Input Validation to More Endpoints

Several endpoints lack request body validation (e.g., `updateGroupDetails`, `resetPassword` relies on middleware but doesn't validate password strength rules).

### 23. Use `PATCH` Instead of `PUT` for Partial Updates

`updateUserInfo` and `updateGroupDetails` perform partial updates (only modify provided fields), which semantically should use `PATCH` rather than `PUT`.
