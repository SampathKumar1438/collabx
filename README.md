# FullStack Real-time Chat Application

## Overview

This is a full-stack real-time chat application built with a modern tech stack. It features real-time messaging, file sharing (minio), authentication (including Google OAuth), and a responsive glassmorphic UI.

## Features

- **Real-time Messaging**: Instant one-on-one and group chats powered by Socket.IO.
- **Authentication**: Secure JWT authentication and Google OAuth integration.
- **File Sharing**: Upload and share files (images, documents) using MinIO object storage.
- **Rich UI/UX**: Modern glassmorphic design, dark mode support, and smooth animations using Framer Motion.
- **Database**: Robust data management with PostgreSQL and Prisma ORM.
- **Security**: Implements best practices with Helmet, CORS, and data validation.

## Tech Stack

### Frontend

- **Framework**: React (Vite)
- **Styling**: TailwindCSS, Framer Motion
- **Icons**: Phosphor Icons
- **State/Network**: Axios, Socket.IO Client, React Query (implied or standard)
- **Routing**: React Router DOM

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM & Sequelize)
- **Object Storage**: MinIO
- **Real-time**: Socket.IO
- **Validation**: Express Validator
- **Logging**: Winston

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL (v14 or higher) - _Must be installed manually_
- Docker (for MinIO object storage only)
- npm or yarn

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FullStack
```

### 2. Database Setup (Manual PostgreSQL)

Since you are not using Docker for the database, you must set it up manually:

1.  **Install PostgreSQL**: Download and install it from [postgresql.org](https://www.postgresql.org/download/).
2.  **Start the Service**: Ensure the PostgreSQL service is running on your machine.
3.  **Create a Database**: Open `psql` or pgAdmin and create a database (e.g., `fullstack_chat`).
    ```sql
    CREATE DATABASE fullstack_chat;
    ```
4.  **Check Credentials**: Note down your PostgreSQL username (default: `postgres`) and password.

### 3. Object Storage Setup (MinIO via Docker)

Use Docker to run the MinIO server:

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

- **Console**: http://localhost:9001 (User: `minioadmin`, Pass: `minioadmin`)
- **API Port**: 9000

### 4. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/fullstack_chat"
JWT_SECRET="your_jwt_secret_key_here"
CLIENT_URL="http://localhost:5173"

# MinIO Configuration
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="fullstack-files"

# Google Auth (Optional)
GOOGLE_CLIENT_ID="your_google_client_id"
```

Run Database Migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the Backend Server:

```bash
npm run dev
```

### 5. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
VITE_APP_NAME="FullStack Chat"
```

Start the Frontend Development Server:

```bash
npm run dev
```

## Running the Project

Once both backend and frontend servers are running, access the application at `http://localhost:5173` (or the port shown in your terminal).

## API Documentation

The backend provides a RESTful API along with WebSocket events.

- **REST API**: Handles auth, user management, and file uploads.
- **Socket.IO**: Handles real-time events like `join_room`, `send_message`, `receive_message`.
