# 🐛 Bugs Found in Whispr Backend

---

## 1. **Wrong `ref` on User Friends Schema** (Injected Bug — Still Present)

- **File:** `user-service/src/models/user.model.ts` (Line 23)
- **Service:** `user-service`
- **Severity:** 🔴 Critical

The `friends` array references `"Chat"` instead of `"User"`. Any `.populate("friends")` call will look in the Chat collection, returning nulls and breaking friends list rendering.

```diff
- ref: "Chat",
+ ref: "User",
```

---

## 2. **Wrong HTTP Method for Decline Friend Request** (Injected Bug — Still Present)

- **File:** `friend-service/src/routes/friendRequest.route.ts` (Line 13)
- **Service:** `friend-service`
- **Severity:** 🔴 Critical

The route uses `router.get` instead of `router.delete`. Frontend DELETE requests to decline friend requests will get a 404.

```diff
- router.get(
+ router.delete(
    "/declineFriendRequest/:id",
```

---

## 3. **`updateUserInfo` Returns `success: false` on Success**

- **File:** `user-service/src/controller/user.controller.ts` (Line 137)
- **Service:** `user-service`
- **Severity:** 🟡 Medium

When the profile is successfully updated, the response body says `success: false`:

```diff
- .json({ success: false, message: "Profile updated successfully" });
+ .json({ success: true, message: "Profile updated successfully" });
```

---

## 4. **`resendVerificationEmail` Returns 200 on Internal Server Error**

- **File:** `auth-service/src/controllers/auth.controller.ts` (Line 426)
- **Service:** `auth-service`
- **Severity:** 🟡 Medium

The catch block returns HTTP 200 instead of 500, masking errors from the client:

```diff
- res.status(200).json({ success: false, message: "Internal server error" });
+ res.status(500).json({ success: false, message: "Internal server error" });
```

---

## 5. **Google OAuth Double `response.json()` Call**

- **File:** `auth-service/src/controllers/auth.controller.ts` (Lines 282-284)
- **Service:** `auth-service`
- **Severity:** 🔴 Critical

The response body is consumed on line 282 (`const accessToken = await response.json()`), then consumed again on line 284 (`const errorDetails = await response.json()`). The second `.json()` call will throw because the body stream is already consumed.

```typescript
const accessToken = await response.json();   // body consumed here
if (!response.ok) {
  const errorDetails = await response.json(); // ❌ throws — body already consumed
```

---

## 6. **Cookies Set with `secure: false` in Production**

- **File:** `auth-service/src/controllers/auth.controller.ts` (Lines 150-162)
- **Service:** `auth-service`
- **Severity:** 🟡 Medium

Both `accessToken` and `refreshToken` cookies are hardcoded with `secure: false`. In production over HTTPS, browsers may refuse to send these cookies, breaking authentication.

```typescript
res.cookie("accessToken", accessToken, {
  httpOnly: false,
  secure: false,         // ❌ Should be true in production
  sameSite: "lax",
```

---

## 7. **`accessToken` Cookie Not `httpOnly`**

- **File:** `auth-service/src/controllers/auth.controller.ts` (Line 158)
- **Service:** `auth-service`
- **Severity:** 🟡 Medium

The `accessToken` is set with `httpOnly: false`, making it accessible to JavaScript and vulnerable to XSS attacks.

---

## 8. **Notification `getNotification` Typo in Empty Response**

- **File:** `notification-service/src/controller/notification.controller.ts` (Line 24)
- **Service:** `notification-service`
- **Severity:** 🟢 Low

The empty-notifications response has `sucess` instead of `success`:

```diff
- res.status(200).json({ sucess: false, notifications: [] });
+ res.status(200).json({ success: true, notifications: [] });
```

Note: It should also be `true` since returning empty notifications is a valid success case.

---

## 9. **SSE Notifications Endpoint Not Authenticated**

- **File:** `notification-service/src/controller/notification.controller.ts` (Line 38)
- **Service:** `notification-service`
- **Severity:** 🔴 Critical

`getNotificationEvent` takes `userId` from `req.query.userId` instead of `req.userId`. Anyone can subscribe to another user's notifications by passing an arbitrary `userId` query parameter — there is no authentication check.

---

## 10. **`consumeEvent` Arguments Swapped in `cluster.ts`**

- **File:** `chat-service/src/cluster.ts` (Lines 126-136)
- **Service:** `chat-service`
- **Severity:** 🔴 Critical

The `consumeEvent` calls in the cluster file have the queue name and routing key arguments swapped compared to the other services. The notification service calls it as `consumeEvent(routingKey, queueName, handler)`, but cluster.ts calls it as `consumeEvent(queueName, routingKey, handler)`. This could cause incorrect RabbitMQ bindings.

---

## 11. **Chat Event Handler Uses Wrong Redis Key Format**

- **File:** `chat-service/src/events/eventHandler.ts` (Lines 14-15)
- **Service:** `chat-service`
- **Severity:** 🟡 Medium

Cache invalidation uses `userChats${id}` (no colon), while the rest of the codebase uses `userChats:${id}` (with a colon). These keys will never match, so the cache won't actually be invalidated when a new chat is created.

```diff
- redisClient.del(`userChats${participants[0]}`),
- redisClient.del(`userChats${participants[1]}`),
+ redisClient.del(`userChats:${participants[0]}`),
+ redisClient.del(`userChats:${participants[1]}`),
```

---

## 12. **`removeMemberFromGroup` Also Has Wrong Redis Key**

- **File:** `chat-service/src/controller/message.controller.ts` (Line 450)
- **Service:** `chat-service`
- **Severity:** 🟡 Medium

`redisClient.del(`userChats${memberId}`)` is missing the colon separator. Should be `userChats:${memberId}`.

---

## 13. **`removeFriend` Missing `await` on `publishEvent`**

- **File:** `user-service/src/controller/user.controller.ts` (Line 183)
- **Service:** `user-service`
- **Severity:** 🟡 Medium

The `publishEvent("chat.deleted", ...)` call is not awaited. If it fails, the error will be an unhandled promise rejection and the session may have already ended in the `finally` block.

```diff
- publishEvent("chat.deleted", {
+ await publishEvent("chat.deleted", {
```

---

## 14. **`resend-verification-email` Route Uses GET but Expects `req.body`**

- **File:** `auth-service/src/routes/auth.route.ts` (Line 38)
- **Service:** `auth-service`
- **Severity:** 🟡 Medium

The route is registered as `router.get("/resend-verification-email", ...)` but the controller reads `const { email } = req.body`. GET requests typically don't have a body. Should be `router.post`.

---

## 15. **Module-Level `session` Variable in `user.controller.ts`**

- **File:** `user-service/src/controller/user.controller.ts` (Line 145)
- **Service:** `user-service`
- **Severity:** 🟡 Medium

`let session` is declared at module level. Under concurrent requests, one request's session could overwrite another's, leading to race conditions and potential data corruption. It should be scoped inside the `removeFriend` function.
