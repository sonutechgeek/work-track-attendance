# WorkTrack — Attendance & Leave Management System

A full-stack attendance and leave management system with role-based access control, GPS check-in/out, live working timer, and real-time notifications.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Node.js 20 + Express 4 (MVC pattern)            |
| Database   | MySQL 8.x                                       |
| ORM        | Prisma 5.x                                      |
| Auth       | JWT (access 15m) + Refresh Token (7d, httpOnly cookie) |
| Realtime   | Socket.io 4                                     |
| Frontend   | React 18 + Vite + Redux Toolkit + Tailwind CSS  |

---

## Project Structure

```
management/
├── server/                  # Node.js backend
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── schema.sql       # Raw MySQL reference SQL
│   │   └── seed.js          # Seed admin + sample data
│   └── src/
│       ├── config/          # Prisma client, Logger, Socket.io
│       ├── controllers/     # Business logic (auth, user, dept, attendance, leave, report)
│       ├── middlewares/     # Auth, RBAC, rate limiter, validation, error handler
│       ├── routes/          # Express routers (one per module)
│       ├── utils/           # ApiResponse, AppError
│       ├── validations/     # Joi schemas
│       ├── app.js           # Express app setup
│       └── server.js        # HTTP server + Socket.io boot
├── blueprint.html           # MongoDB architecture blueprint
├── blueprint-mysql.html     # MySQL/Prisma architecture blueprint
├── api-guide.html           # Visual API testing guide (open in browser)
├── WorkTrack.postman_collection.json  # Import into Postman to test all APIs
└── README.md
```

---

## Quick Start

```bash
# 1. Go to server directory
cd server

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL with your MySQL credentials

# 4. Push schema to MySQL (tables already created via schema.sql)
npx prisma generate

# 5. Seed database
node prisma/seed.js

# 6. Start dev server
npm run dev
# Server runs at http://localhost:5000
```

---

## Test Credentials

| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | admin@company.com        | Admin@1234     |
| Manager  | manager@company.com      | Manager@1234   |
| Employee | employee@company.com     | Employee@1234  |

---

## Roles & Permissions

| Action                        | Admin | Manager | Employee |
|-------------------------------|:-----:|:-------:|:--------:|
| Manage departments & users    | ✅    | ❌      | ❌       |
| View all attendance/leaves    | ✅    | ❌      | ❌       |
| View/manage team attendance   | ✅    | ✅      | ❌       |
| Approve/reject team leaves    | ✅    | ✅      | ❌       |
| Check in/out, apply leave     | ✅    | ✅      | ✅       |
| View own data only            | ✅    | ✅      | ✅       |

---

## API Reference

**Base URL:** `http://localhost:5000/api/v1`  
**Auth Header:** `Authorization: Bearer {accessToken}`

---

### Auth

| Method | Endpoint              | Role     | Description                              |
|--------|-----------------------|----------|------------------------------------------|
| POST   | /auth/login           | Public   | Login — returns accessToken + sets cookie |
| GET    | /auth/me              | All      | Current user profile                     |
| POST   | /auth/refresh         | Cookie   | Rotate tokens using httpOnly cookie      |
| PATCH  | /auth/me/password     | All      | Change own password                      |
| POST   | /auth/logout          | All      | Invalidate session                       |

**Login request:**
```json
POST /auth/login
{
  "email": "admin@company.com",
  "password": "Admin@1234"
}
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "user": { "id": 1, "name": "Super Admin", "role": "ADMIN" }
  }
}
```

> The `refreshToken` is stored as an httpOnly cookie automatically. Postman handles it if "Send cookies" is enabled.

**Security features:**
- 5 failed login attempts → 30-minute account lockout
- Rate limit: 5 login attempts per 15 minutes per IP
- Password must contain uppercase + lowercase + number (min 8 chars)

---

### Departments

| Method | Endpoint            | Role  | Description                           |
|--------|---------------------|-------|---------------------------------------|
| GET    | /departments        | All   | List all departments with head & count |
| POST   | /departments        | Admin | Create department                     |
| GET    | /departments/:id    | All   | Department detail with employee list  |
| PATCH  | /departments/:id    | Admin | Update name, description, head        |
| DELETE | /departments/:id    | Admin | Delete (fails if active employees)    |

**Create department:**
```json
POST /departments
{
  "name": "Human Resources",
  "description": "HR Department",
  "headId": 2
}
```

---

### Users

| Method | Endpoint                       | Role          | Description                          |
|--------|--------------------------------|---------------|--------------------------------------|
| GET    | /users                         | Admin         | Paginated list with filters          |
| POST   | /users                         | Admin         | Create user + auto-seed leave balance |
| GET    | /users/:id                     | Admin         | User profile + leave balances        |
| PATCH  | /users/:id                     | Admin         | Update any user field                |
| DELETE | /users/:id                     | Admin         | Soft-delete (isActive: false)        |
| PATCH  | /users/:id/assign-manager      | Admin         | Assign or remove manager             |
| GET    | /users/my-team                 | Manager       | Manager's own team                   |
| PATCH  | /users/my-profile              | All           | Update own name/phone/avatar         |
| GET    | /users/:id/leave-balance       | Admin/Manager | View leave balance for a year        |
| PATCH  | /users/:id/leave-balance       | Admin         | Override leave quotas                |

**Query params for GET /users:**
- `page`, `limit` — pagination (default: 1, 20)
- `role` — ADMIN / MANAGER / EMPLOYEE
- `departmentId` — filter by department
- `search` — searches name, email, employeeId
- `isActive` — true / false

**Create user:**
```json
POST /users
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "password": "Jane@1234",
  "role": "EMPLOYEE",
  "employeeId": "EMP010",
  "departmentId": 1,
  "managerId": 2,
  "phone": "+91-9876543210"
}
```

---

### Attendance

| Method | Endpoint                   | Role          | Description                        |
|--------|----------------------------|---------------|------------------------------------|
| GET    | /attendance/live-timer     | All           | Check-in time + elapsed ms         |
| GET    | /attendance/today          | All           | Today's attendance record          |
| POST   | /attendance/check-in       | All           | Check in with GPS coordinates      |
| POST   | /attendance/check-out      | All           | Check out, compute working hours   |
| GET    | /attendance/my             | All           | Own history with date filter       |
| GET    | /attendance/team           | Admin/Manager | Team attendance (manager-scoped)   |
| GET    | /attendance                | Admin         | All attendance org-wide            |
| PATCH  | /attendance/:id            | Admin         | Manual correction                  |

**Check-in request:**
```json
POST /attendance/check-in
{
  "lat": 28.6139,
  "lng": 77.2090,
  "address": "Connaught Place, New Delhi"
}
```

**Attendance statuses:** `PRESENT` `ABSENT` `HALF_DAY` `LEAVE` `WFH` `FIELD_VISIT`

> **Live timer:** Frontend calls `GET /attendance/live-timer` on page load and uses `elapsedMs` to seed the timer — no localStorage needed, survives page refreshes.

> **Constraint:** One attendance record per employee per calendar day (DB unique index). Duplicate check-in returns HTTP 400.

---

### Leaves

| Method | Endpoint                  | Role          | Description                                 |
|--------|---------------------------|---------------|---------------------------------------------|
| GET    | /leaves/my-balance        | All           | Own leave balance for the year              |
| POST   | /leaves                   | All           | Apply for leave (checks balance first)      |
| GET    | /leaves/my                | All           | Own leave history                           |
| GET    | /leaves/pending           | Admin/Manager | Pending leaves (manager-scoped)             |
| GET    | /leaves/:id               | Scoped        | Single leave (access-controlled)            |
| POST   | /leaves/:id/approve       | Admin/Manager | Approve — atomic transaction                |
| POST   | /leaves/:id/reject        | Admin/Manager | Reject with mandatory comments              |
| DELETE | /leaves/:id               | Employee      | Cancel own pending leave                    |
| GET    | /leaves                   | Admin         | All leaves org-wide                         |

**Leave types:**

| Type        | Deducts Balance | Attendance Status |
|-------------|:--------------:|:-----------------:|
| CASUAL      | ✅ casualUsed  | LEAVE             |
| SICK        | ✅ sickUsed    | LEAVE             |
| HALF_DAY    | ✅ halfDayUsed | HALF_DAY          |
| WFH         | ✅ wfhUsed     | WFH               |
| EARLY_LEAVE | ❌             | PRESENT           |
| FIELD_VISIT | ❌             | FIELD_VISIT       |

**Apply leave:**
```json
POST /leaves
{
  "type": "CASUAL",
  "startDate": "2026-07-10",
  "endDate": "2026-07-11",
  "reason": "Family function"
}
```

**Approve leave:**
```json
POST /leaves/1/approve
{
  "comments": "Approved."
}
```

**What happens on approval (atomic `$transaction`):**
1. Leave status → `APPROVED`
2. Attendance rows created for each working day in the range
3. Leave balance `*_used` incremented (for balance-deducting types)

> All three operations succeed or all fail together. Partial approvals are impossible.

**Reject leave:**
```json
POST /leaves/1/reject
{
  "comments": "Insufficient balance."
}
```
> `comments` is **required** when rejecting (min 3 chars).

---

### Reports

| Method | Endpoint                      | Role          | Description                          |
|--------|-------------------------------|---------------|--------------------------------------|
| GET    | /reports/dashboard            | Admin         | Today stats + org totals + monthly   |
| GET    | /reports/attendance-summary   | Admin/Manager | Per-employee status breakdown        |
| GET    | /reports/leave-summary        | Admin/Manager | Leave balance table                  |
| GET    | /reports/monthly              | Admin         | Monthly attendance + leave breakdown |

**Dashboard response:**
```json
{
  "data": {
    "today": { "presentToday": 12, "leavesToday": 2, "pendingLeaves": 5 },
    "totals": { "totalEmployees": 48, "totalDepartments": 6 },
    "monthlyAttendanceSummary": [
      { "status": "PRESENT", "count": 280 }
    ]
  }
}
```

**Query params:**
- `/reports/attendance-summary?from=2026-06-01&to=2026-06-30&departmentId=1`
- `/reports/leave-summary?year=2026&departmentId=1`
- `/reports/monthly?year=2026&month=6&departmentId=1`

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "email", "message": "email is required" }
  ]
}
```

---

## HTTP Status Codes

| Code | Meaning                                      |
|------|----------------------------------------------|
| 200  | OK                                           |
| 201  | Created                                      |
| 400  | Validation error / bad request               |
| 401  | Unauthenticated (missing or invalid token)   |
| 403  | Unauthorized (insufficient role / scope)     |
| 404  | Resource not found                           |
| 409  | Conflict (duplicate email, employeeId, etc.) |
| 423  | Account locked (too many failed logins)      |
| 429  | Rate limit exceeded                          |
| 500  | Internal server error                        |

---

## Real-Time Events (Socket.io)

The server emits events to connected clients.

| Event                  | Emitted To      | Trigger                         |
|------------------------|-----------------|---------------------------------|
| `attendance:checkedIn` | Employee        | Successful check-in             |
| `attendance:checkedOut`| Employee        | Successful check-out            |
| `leave:newRequest`     | Manager + Admin | Employee applies for leave      |
| `leave:approved`       | Employee        | Leave is approved               |
| `leave:rejected`       | Employee        | Leave is rejected               |

**Connection:** `ws://localhost:5000` with `auth: { token: accessToken }`

---

## Environment Variables

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="mysql://root:password@localhost:3306/worktrack_db"
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another_secret_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

---

## Postman Testing

1. Import `WorkTrack.postman_collection.json` into Postman
2. The **Login** request auto-saves the `accessToken` collection variable
3. All other requests use `{{accessToken}}` — no manual copying needed
4. Enable **"Send cookies"** in Postman settings for the refresh token to work
5. Update `{{userId}}`, `{{departmentId}}`, `{{leaveId}}`, `{{attendanceId}}` variables as you create records
