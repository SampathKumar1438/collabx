# CollabX - Real-time Collaboration & Chat Platform

**CollabX** is a powerful, full-stack real-time messaging and collaboration application designed for seamless communication. Built with a modern tech stack, it combines robust chat functionality with rich media sharing, interactive polls, and audio/video calling capabilities, all wrapped in a sleek, glassmorphic user interface.

## 🚀 Features

### 💬 Advanced Messaging

- **Real-time Chat**: Instant delivery for 1-on-1 and Group chats powered by **Socket.IO**.
- **Message Status**: Visual indicators for Sent, Delivered, and Read receipts.
- **Rich Media**: Share images and documents securely via **MinIO** object storage.
- **Interactive Elements**:
  - Typing indicators to see when others are replying.
  - Live online/offline user status.
  - Emoji picker integration (`emoji-mart`) for expressive conversations.

### 📞 Communication & Collaboration

- **Audio & Video Calls**: High-quality real-time calls using **WebRTC**.
- **Interactive Polls**: Create and vote on polls within chat groups with real-time result updates.
- **Group Management**: Create groups, manage members, and customize group profiles.

### 🔐 Security & Authentication

- **Secure Access**: JWT-based authentication for stateless, secure API access.
- **Profile Security**: Password reset and update functionality via Email (Postmark/Resend).

### 🎨 Modern UI/UX

- **Glassmorphism Design**: beautiful, translucent UI elements using **TailwindCSS**.
- **Fluid Animations**: Smooth transitions and interaction effects with **Framer Motion**.
- **Responsiveness**: Fully responsive layout optimized for all device sizes.
- **Themes**: Native support for Light and Dark modes.
- **Image Tools**: Built-in image cropping and adjustment (`react-easy-crop`) for profile and group photos.

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: [React](https://react.dev/) (v18) via [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) & [PostCSS](https://postcss.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State & Networking**: [Axios](https://axios-http.com/), [Socket.IO Client](https://socket.io/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Utilities**: `date-fns` (dates), `phosphor-icons` (icons), `react-hot-toast` (notifications)

### Backend

- **Runtime**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Real-time Engine**: [Socket.IO](https://socket.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/) (Primary)
- **Storage**: [MinIO](https://min.io/) (S3-compatible object storage)
- **Security**: `helmet`, `cors`, `bcryptjs`, `jsonwebtoken`
- **Email**: `postmark`, `nodemailer`

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **PostgreSQL** (v14+)
- **Docker** (required for running MinIO locally)

---

## ⚡ Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd collabx
```

### 2. Database Setup

Ensure your local PostgreSQL service is running and create a database:

```sql
CREATE DATABASE fullstack_chat;
```

### 3. Object Storage (MinIO)

Run MinIO using Docker:

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

- **Console**: [http://localhost:9001](http://localhost:9001)
- **Credentials**: `minioadmin` / `minioadmin`

### 4. Backend Configuration

Navigate to the `backend` folder and setup environment variables:

```bash
cd backend
npm install
cp .env.example .env  # or create .env manually
```

**Recommended `.env` details**:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/fullstack_chat"
JWT_SECRET="your_secure_jwt_secret"
CLIENT_URL="http://localhost:5173"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="fullstack-files"

# Email & Auth (Optional for local dev)
POSTMARK_SERVER_TOKEN="..."
```

Run migrations and start server:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 5. Frontend Configuration

Navigate to the `frontend` folder:

```bash
cd ../frontend
npm install
```

Create `/frontend/.env`:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_APP_NAME="CollabX"
```

Start the frontend:

```bash
npm run dev
```

---

## 🔗 API Documentation

CollabX uses a hybrid approach with REST and WebSockets.

- **REST API** (`/api/v1`):

  - `/auth`: Login, Register, Refresh Token
  - `/user`: Profile management, contact updates.
  - `/chat`: Conversation management (Inbox, Groups).
  - `/messages`: Message history and retrieval.
  - `/polls`: Poll creation and voting.

- **WebSocket Events**:
  - `connection`: Authenticate handshake.
  - `start_conversation`: Initiate private chats.
  - `new_message`: Real-time message payload.
  - `typing`: Indicators for user activity.
  - `call_user` / `call_accepted`: WebRTC signaling.
