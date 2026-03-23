# 🏢 Society Management System — Backend

A RESTful backend API for a **Society/Flat Management System [Society Keeper]** built with **Node.js**, **Express**, and **PostgreSQL**. It supports role-based access control for **Admins** and **Residents**, with JWT authentication and Google OAuth2 login.

---

## 🚀 Features

- **JWT-based Authentication** (Register / Login)
- **Google OAuth2** login & account linking
- **Role-based access control** — Admin & Resident roles
- **Admin Panel APIs** — manage flats, subscriptions, payments, and send notifications
- **Resident APIs** — view dues, payment history, notifications, and update profile
- **PostgreSQL** database via [Neon](https://neon.tech) (serverless Postgres)

---

## 🛠️ Tech Stack

| Technology           | Purpose                         |
| -------------------- | ------------------------------- |
| Node.js + Express 5  | Web server & routing            |
| PostgreSQL (`pg`)    | Database                        |
| JWT (`jsonwebtoken`) | Stateless authentication        |
| bcrypt               | Password hashing                |
| Google Auth Library  | Google OAuth2 verification      |
| dotenv               | Environment variable management |
| cors                 | Cross-origin resource sharing   |
| nodemon              | Dev server with hot reload      |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js               # App entry point, middleware & route mounting
│   ├── config/
│   │   └── db.js               # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── authController.js   # Register, Login, Google Auth
│   │   ├── adminController.js  # Admin operations (flats, payments, stats)
│   │   └── residentController.js # Resident operations (dues, payments, profile)
│   ├── middleware/
│   │   ├── middleware.js       # JWT authentication middleware
│   │   ├── isAdmin.js          # Role check: Admin only
│   │   └── isResident.js       # Role check: Resident only
│   ├── routes/
│   │   ├── authRoutes.js       # /auth routes
│   │   ├── adminRoutes.js      # /admin routes
│   │   └── residentRoutes.js   # /resident routes
│   └── utils/
│       └── jwtUtils.js         # JWT token generation helper
├── .env                        # Environment variables (not committed)
├── .sql                        # Database schema reference (SQL)
├── package.json
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A PostgreSQL database (local or [Neon](https://neon.tech))
- A Google Cloud project with OAuth2 credentials

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root of the `backend/` directory:

```env
PORT=4000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:3000
```

> ⚠️ Never commit your `.env` file to version control.

### 4. Set Up the Database

Run the SQL statements from `.sql` in your PostgreSQL client to create the required tables:

- `users`
- `flat_subscriptions`
- `monthly_records`
- `notifications`
- `payments`

### 5. Run the Server

**Development** (with hot reload via nodemon):

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The server will start at `http://localhost:4000` (or the port defined in `.env`).

---

## 📡 API Endpoints

### Auth — `/auth`

| Method | Endpoint         | Description                        |
| ------ | ---------------- | ---------------------------------- |
| `POST` | `/auth/register` | Register a new resident            |
| `POST` | `/auth/login`    | Login with email & password        |
| `POST` | `/auth/google`   | Login / Register via Google OAuth2 |

### Admin — `/admin` _(requires JWT + Admin role)_

| Method   | Endpoint                    | Description                       |
| -------- | --------------------------- | --------------------------------- |
| `GET`    | `/admin/flats`              | Get all flats                     |
| `GET`    | `/admin/flats/:flat_id`     | Get a flat by ID                  |
| `POST`   | `/admin/add-flat`           | Add a new flat                    |
| `PUT`    | `/admin/update-flat`        | Update flat details               |
| `DELETE` | `/admin/delete-flat`        | Delete a flat                     |
| `PATCH`  | `/admin/flats/subscription` | Update flat subscription & notify |
| `GET`    | `/admin/dashboard-stats`    | Get dashboard statistics          |
| `GET`    | `/admin/reports`            | Get payment reports               |
| `GET`    | `/admin/subscription-plans` | Get available subscription plans  |
| `PATCH`  | `/admin/update-profile`     | Update admin profile              |
| `POST`   | `/admin/add-payment`        | Record a payment                  |
| `POST`   | `/admin/send-notification`  | Send a notification to residents  |

### Resident — `/resident` _(requires JWT + Resident role)_

| Method  | Endpoint                      | Description                    |
| ------- | ----------------------------- | ------------------------------ |
| `GET`   | `/resident/current-due`       | Get current month's due amount |
| `GET`   | `/resident/previous-payments` | Get payment history            |
| `GET`   | `/resident/notifications`     | Get resident notifications     |
| `PATCH` | `/resident/update-profile`    | Update resident profile        |
| `POST`  | `/resident/pay-now`           | Make a payment                 |

---

## 🔐 Authentication

All protected routes require a **Bearer Token** in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens are issued on successful login or Google auth and should be stored securely on the client side.

---

## 🗄️ Database Schema (Overview)

| Table                | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `users`              | Stores all users (admin & resident), supports Google ID linking |
| `flat_subscriptions` | Flat details with subscription plan and resident assignment     |
| `monthly_records`    | Tracks monthly payment dues per flat                            |
| `payments`           | Records all payment transactions                                |
| `notifications`      | Stores admin-sent notifications for residents                   |

----
