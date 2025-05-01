# 🧩 Microservices Chat Backend (MERN + Socket.IO)

This is the backend of a **Chat Application** built with a **microservices architecture** using the **MERN stack** and **Socket.IO** for real-time communication. It consists of four main services:

- **Auth Service**: Handles registration, login, token management, and authentication.
- **User Service**: Manages user profiles and user-related operations.
- **Chat Service**: Manages conversations, messages, and real-time WebSocket communication.
- **Notification Service**: Sends and tracks in-app and push notifications.

## ⚙️ Tech Stack

- **MongoDB** – Document-based database
- **Express.js** – Server framework
- **React.js** – (for the frontend; not included here)
- **Node.js** – Backend runtime
- **Socket.IO** – Real-time bi-directional communication
- **JWT** – Authentication tokens
- **RabbitMQ / Event Bus** – For inter-service communication (optional for scaling)

---

## 📦 Microservices Overview

Each service is deployed independently and communicates over HTTP or an event bus.

### 1. Auth Service

- JWT-based login & signup
- Refresh token mechanism
- Role-based authorization (optional)
- Public routes: `/api/auth/register`, `/api/auth/login`
- Protected routes: `/api/auth/me`

### 2. User Service

- CRUD for user profiles
- Fetch user details
- Edit avatar, bio, status
- Routes: `/api/users/:id`, `/api/users/update`, `/api/users/status`

### 3. Chat Service

- Create one-on-one and group chats
- Send/receive messages (with Socket.IO)
- Typing indicators, message seen status
- Routes: `/api/chats`, `/api/messages`, `/api/messages/:chatId`

### 4. Notification Service

- Send real-time notifications using Socket.IO
- Store notifications in MongoDB
- Mark as read/unread
- Routes: `/api/notifications`, `/api/notifications/:userId`

---

## 🧪 Running Locally

### Prerequisites

- Node.js ≥ v18
- MongoDB (local or Atlas)
- Redis or RabbitMQ (if using events)
- Docker (optional for containerization)

### Environment Setup

Each service has its own `.env` file. Example for Auth:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
MONGO_URI=mongodb://localhost:27017/auth-db
```
