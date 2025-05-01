# 🚀 Whispr: The Real-Time Chat Microverse 💬

Dive into Whispr, a **blazing-fast, real-time chat application** designed with a **microservices architecture**. Built using the **MERN stack** and powered by **Socket.IO**, Whispr delivers seamless communication through independently scalable services. 

## 📦 Overview

Whispr is structured as a set of microservices, each handling specific aspects of the chat application:

- **Auth Service**: Handles user registration, login, and authentication.
- **User Service**: Manages user profiles and settings.
- **Friend Service**: Manages friend requests and relationships.
- **Chat Service**: Powers real-time messaging and group chats.
- **Notification Service**: Delivers real-time notifications.
- **API Gateway**: Acts as a single entry point for all client requests.

## 🛠️ Installation

Get Whispr up and running locally with these simple steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Swag-blips/Archives-whisprchat.git
   cd Archives-whisprchat
   ```

2. **Install Dependencies**:
   Navigate to each service directory (`api-gateway`, `auth-service`, `user-service`, `friend-service`, `chat-service`, `notification-service`) and run:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Each service requires its own `.env` file. Here’s an example for the `auth-service`:
   ```env
   PORT=5000
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/auth-db
   RABBITMQ_URL=amqp://localhost
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   NODEMAILER_EMAIL=your_email@gmail.com
   NODEMAILER_PASS=your_email_password
   ```
   Make sure to configure each service with the appropriate environment variables.

4. **Start the Services**:
   In each service directory, run:
   ```bash
   npm run dev
   ```
   This will start each service in development mode with `nodemon`.

## 🚀 Usage

### API Gateway

The API Gateway acts as the single entry point for all services. It proxies requests to the appropriate microservice based on the route.

```typescript
app.use(
  "/v1/auth",
  proxy(process.env.AUTH_SERVICE_PORT as string, { ...proxyOptions })
);
```

### Auth Service

Handles user authentication and authorization.

```typescript
router.post("/register", validateRequest(registrationSchema), register);
router.post("/login", validateRequest(loginSchema), Login);
```

### User Service

Manages user profiles and settings.

```typescript
router.get("/currentUser", authenticateRequest, getCurrentUser);
router.put("/currentUser", authenticateRequest, updateUserInfo);
```

### Friend Service

Handles friend requests and relationships.

```typescript
router.post("/sendFriendRequest", authenticateRequest, sendFriendRequest);
router.post("/acceptFriendRequest", authenticateRequest, acceptFriendRequest);
```

### Chat Service

Powers real-time messaging and group chats.

```typescript
router.post(
  "/message/:chatId",
  authenticateRequest,
  validateRequest(messageSchema),
  sendMessage
);
```

### Notification Service

Delivers real-time notifications.

```typescript
router.get("/notifications", authenticateRequest, getNotification);
```

<details>
<summary>Detailed Usage Instructions</summary>

1.  **Register a new user**: Send a POST request to `/v1/auth/register` via the API Gateway with the required information like username, email, and password.

2.  **Login**: After registration, send a POST request to `/v1/auth/login` to log in and receive an OTP for verification.

3.  **Verify OTP**: Use the `/v1/auth/verify-otp` endpoint to verify the OTP and receive your access and refresh tokens.

4.  **Access protected resources**: Include the access token in the `Authorization` header as a Bearer token when making requests to protected routes.

</details>

## ✨ Features

- 🔑 **Secure Authentication**: Uses JWT for secure user authentication.
- ⚡ **Real-Time Messaging**: Powered by Socket.IO for instant message delivery.
- 🧑‍💻 **Microservices Architecture**: Independently scalable services for better performance and maintainability.
- ✉️ **Notifications**: Real-time notifications for friend requests and new messages.
- 👤 **User Profiles**: Customizable user profiles with avatars and bios.
- 🛡️ **Rate Limiting**: Protects against abuse with rate limiting middleware.
- ⚙️ **Redis Caching**: Improves performance by caching frequently accessed data.
- ✉️ **RabbitMQ**: Inter-service communication using events.

## 💻 Technologies Used

| Technology    | Description                               | Documentation                                  |
| :------------ | :---------------------------------------- | :--------------------------------------------- |
| Node.js       | Backend runtime                           | [nodejs.org](https://nodejs.org/)              |
| Express.js    | Server framework                          | [expressjs.com](https://expressjs.com/)        |
| MongoDB       | Document-based database                   | [mongodb.com](https://www.mongodb.com/)        |
| Socket.IO     | Real-time communication                   | [socket.io](https://socket.io/)                |
| JWT           | Authentication tokens                     | [jwt.io](https://jwt.io/)                      |
| RabbitMQ      | Message broker                            | [rabbitmq.com](https://www.rabbitmq.com/)      |
| Redis         | In-memory data store                      | [redis.io](https://redis.io/)                  |
| TypeScript    | Superset of JavaScript                    | [typescriptlang.org](https://www.typescriptlang.org/) |

## 🤝 Contributing

Contributions are welcome! Here’s how you can contribute:

- 🐛 **Report Bugs**: Submit bug reports with detailed steps to reproduce.
- 🛠️ **Suggest Features**: Propose new features and enhancements.
- 💻 **Submit Pull Requests**: Contribute code improvements and fixes.

### Contribution Guidelines

- 📝 Use clear and concise commit messages.
- 🧪 Write tests for new features and bug fixes.
- 📖 Follow the project’s coding style and conventions.

## 📜 License

This project is licensed under the [MIT License](LICENSE).


[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://github.com/samueltuoyo15/Dokugen)
