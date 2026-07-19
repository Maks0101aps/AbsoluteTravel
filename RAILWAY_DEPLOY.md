# 🚀 Deployment Guide: Railway (Production)

This guide explains how to deploy the **Absolute Travel** monorepo to Railway.

We configure the application as **two separate services** in the same Railway project:
1. **Backend Service** (NestJS API & Database)
2. **Frontend Service** (React & Vite SPA)

---

## 🛠️ Step 1: Create Services on Railway

1. Go to [Railway Dashboard](https://railway.app/) and create a new project.
2. Link your GitHub repository.
3. Add **two** services pointing to the same repository:
   - **Service 1: Backend**
     - Go to Service Settings -> **Root Directory** and set it to `/backend`.
     - Go to Service Settings -> **Public Networking** and generate a Domain (or add a custom one). Copy this URL (e.g., `https://backend-production-xyz.up.railway.app`).
   - **Service 2: Frontend**
     - Go to Service Settings -> **Root Directory** and set it to `/frontend`.
     - Go to Service Settings -> **Public Networking** and generate a Domain (or add a custom one).

---

## 💾 Step 2: Database Setup (SQLite Volume)

Since the Prisma schema is configured to use SQLite, the database is stored in a local file (`dev.db`). By default, Railway containers have ephemeral filesystems. To keep user data persistent:

1. In the **Backend Service** settings, go to the **Volumes** tab.
2. Click **Add Volume** to attach a persistent volume (e.g. mount path `/app/prisma/data` or `/app/backend/prisma/data`).
3. Set the `DATABASE_URL` environment variable for the backend service to point to the volume path:
   ```env
   DATABASE_URL="file:/app/backend/prisma/data/prod.db"
   ```

*(Alternatively, if you wish to migrate to PostgreSQL, you can provision a Postgres database on Railway, change the `provider = "sqlite"` to `provider = "postgresql"` in `backend/prisma/schema.prisma`, run `npx prisma migrate dev`, and set `DATABASE_URL` to your Railway Postgres connection string).*

---

## ⚙️ Step 3: Environment Variables

Configure the following environment variables in the Railway settings:

### 🚀 Backend Service
| Variable | Value / Description |
|---|---|
| `PORT` | `3000` (Railway automatically overrides this, but good to have) |
| `DATABASE_URL` | `file:/app/backend/prisma/data/prod.db` (for SQLite persistence) |
| `GEMINI_API_KEY` | *Your Google Gemini API Key* |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `ADMIN_LOGIN` | *Secure admin username* |
| `ADMIN_PASSWORD` | *Secure admin password* |
| `MAILTRAP_USER` | *SMTP Username (if using email verification)* |
| `MAILTRAP_PASS` | *SMTP Password (if using email verification)* |
| `MAILTRAP_HOST` | `sandbox.smtp.mailtrap.io` |
| `MAILTRAP_PORT` | `2525` |

### 🌐 Frontend Service
| Variable | Value / Description |
|---|---|
| `VITE_API_URL` | The full URL of your deployed Backend service (e.g., `https://backend-production-xyz.up.railway.app`) |
