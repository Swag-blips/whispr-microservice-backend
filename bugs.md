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

## 5. **`removeMemberFromGroup` Has Wrong Redis Key**

- **File:** `chat-service/src/services/message.service.ts` (Line 387)
- **Service:** `chat-service`
- **Severity:** 🟡 Medium

`redisClient.del(`userChats${memberId}`)` is missing the colon separator. Should be `userChats:${memberId}` to match the format used everywhere else in the codebase.

---

## 6. **`removeFriend` Missing `await` on `publishEvent`**

- **File:** `user-service/src/controller/user.controller.ts` (Line 183)
- **Service:** `user-service`
- **Severity:** 🟡 Medium

The `publishEvent("chat.deleted", ...)` call is not awaited. If it fails, the error will be an unhandled promise rejection and the session may have already ended in the `finally` block.

```diff
- publishEvent("chat.deleted", {
+ await publishEvent("chat.deleted", {
```

---

## 7. **`resend-verification-email` Route Uses GET but Expects `req.body`**

- **File:** `auth-service/src/routes/auth.route.ts` (Line 38)
- **Service:** `auth-service`
- **Severity:** 🟡 Medium

The route is registered as `router.get("/resend-verification-email", ...)` but the controller reads `const { email } = req.body`. GET requests typically don't have a body. Should be `router.post`.

---

## 8. **Module-Level `session` Variable in `user.controller.ts`**

- **File:** `user-service/src/controller/user.controller.ts` (Line 145)
- **Service:** `user-service`
- **Severity:** 🟡 Medium

`let session` is declared at module level. Under concurrent requests, one request's session could overwrite another's, leading to race conditions and potential data corruption. It should be scoped inside the `removeFriend` function.

---

## 9. **`getUser` Search Cache Contamination**

- **File:** `user-service/src/controller/user.controller.ts` (Line 50-63)
- **Service:** `user-service`
- **Severity:** 🔴 Critical

Search results are filtered to exclude the current user (the searcher) and then cached globally in Redis. This means if User A searches for "Alex", their own profile is excluded from the results, and this "A-less" result set is cached for everyone. Subsequent users searching for "Alex" will also miss User A's profile.

---

## 12. **Authorization Bypass in `markNotificationsAsRead`**

- **File:** `notification-service/src/controller/notification.controller.ts` (Lines 60-82)
- **Service:** `notification-service`
- **Severity:** 🟡 Medium

The endpoint updates multiple notifications based on `notificationIds` provided in the request body but does not filter the update query to the current user's `userId`. This allows an attacker to mark any user's notifications as read if they know the IDs.

---

## 13. **Brittle Array Match for Chat Deletion**

- **File:** `chat-service/src/events/eventHandler.ts` (Line 38-46)
- **Service:** `chat-service`
- **Severity:** 🟡 Medium

`Chat.findOneAndDelete` uses an exact array match `{ participants: [user1, user2] }`. In MongoDB, array order matters for exact matches. If the chat was created as `[user2, user1]`, this deletion will fail silently. Use `$all` or enforce a sorted order during creation/deletion.

---

## 14. **Group Message Worker Cache Persistence**

- **File:** `chat-service/src/utils/addMessageWorker.ts` (Line 73-76)
- **Service:** `chat-service`
- **Severity:** 🟡 Medium

The worker only clears the `userChats` cache for the sender and a one `receiverId`. In group chats, it fails to invalidate the cache for all other participants in the group, leaving them with stale `lastMessage` data in their chat lists.

---

## 15. **`getChatFilesService` Authorization Bypass**

- **File:** `chat-service/src/services/message.service.ts` (Line 660-672)
- **Service:** `chat-service`
- **Severity:** 🔴 Critical / Security

This service retrieves files for a `chatId` without verifying if the `userId` is a member of that chat. Any authenticated user can access private files from any chat by discovering the `chatId`.

---

## 16. **Inconsistent Redis Key Schema**

- **File:** `chat-service/src/services/message.service.ts` (Multiple lines)
- **Service:** `chat-service`
- **Severity:** 🔵 Minor

The service uses `permittedChats${userId}` (no separator) but `userChats:${userId}` (colon separator). This inconsistency complicates key management and invalidation logic.

---

## 17. **Global Message Broadcast (Privacy Leak)**

- **File:** `chat-service/src/services/message.service.ts` (Multiple lines)
- **Service:** `chat-service`
- **Severity:** 🔴 Critical / Security

Every message sent is broadcasted to ALL connected users via `io.emit("newMessage", ...)` instead of being restricted to the specific chat room with `io.to(chatId).emit(...)`. This exposes every private conversation to everyone online.

---

## 18. **Password Comparison Bypass**

- **File:** `auth-service/src/services/auth.service.ts` (Line 108)
- **Service:** `auth-service`
- **Severity:** 🔴 Critical / Security

The `isValid` check in `LoginService` has been hardcoded to `true`, effectively disabling password verification. Any user can trigger an OTP for any email address using an arbitrary password.
