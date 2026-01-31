# Admin Setup Guide

This guide explains how to set up the admin account and user approval system in Overwatch.

## Overview

Overwatch now has a two-tier user registration system:
1. **Admin accounts** - Can approve/reject user registrations
2. **Regular user accounts** - Require admin approval before they can login

## Initial Setup

### 1. Run Database Migration

First, apply the database migration to add role and status fields to the users table:

```bash
# Connect to your PostgreSQL database and run:
psql -U overwatch -d overwatch -f db/migrations/006_add_user_roles_and_status.sql
```

Or if using Docker:

```bash
docker-compose exec db psql -U overwatch -d overwatch -f /docker-entrypoint-initdb.d/006_add_user_roles_and_status.sql
```

### 2. Set Admin Registration Secret

The admin registration requires a secret key to prevent unauthorized admin accounts.

1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set a strong admin secret:
   ```
   ADMIN_REGISTRATION_SECRET=your-secure-random-secret-here
   ```

3. Make sure to use a strong, random secret in production. You can generate one using:
   ```bash
   openssl rand -base64 32
   ```

### 3. Restart the Server

Restart the Hocuspocus server to load the new environment variable:

```bash
# If using Docker:
docker-compose restart hocuspocus

# Or if running directly:
cd server/hocuspocus
npm run dev
```

## Registering the First Admin

### Method 1: Via Web Interface

1. Navigate to the application in your browser
2. On the login screen, click "Register as Admin" at the bottom
3. Fill in:
   - Display Name
   - Email
   - Password
   - Admin Secret Key (the value you set in `.env`)
4. Click "Register as Admin"
5. You'll be logged in immediately with admin privileges

### Method 2: Via API

You can also register an admin via the API:

```bash
curl -X POST http://localhost:1235/api/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure-password",
    "name": "Admin User",
    "adminSecret": "your-admin-secret-from-env"
  }'
```

## Using the Admin Dashboard

Once logged in as an admin, you'll see the Admin Dashboard instead of the map interface.

### Features:

1. **Pending Approvals Tab**
   - View all users waiting for approval
   - See registration date and user details
   - Approve or reject individual users

2. **All Users Tab**
   - View all registered users
   - See user roles (Admin/User)
   - See user status (Approved/Pending/Rejected)

### Approving Users:

1. Go to the "Pending Approvals" tab
2. Review user details
3. Click "Approve" to grant access or "Reject" to deny

Approved users can immediately log in and access the map interface.

## User Registration Flow

### For New Users:

1. Visit the application
2. Click "Sign up"
3. Fill in display name, email, and password
4. Click "Create Account"
5. See message: "Registration successful. Please wait for admin approval."
6. Wait for admin to approve the account
7. Once approved, log in with credentials

### Login Restrictions:

- **Pending users**: Cannot log in (shows "Your account is pending admin approval")
- **Rejected users**: Cannot log in (shows "Your account has been rejected")
- **Approved users**: Can log in and access the map
- **Admin users**: Can log in and access the admin dashboard

## Security Best Practices

1. **Keep the admin secret secure**
   - Don't commit it to version control
   - Use a strong, random value in production
   - Rotate it periodically

2. **Limit admin accounts**
   - Only create admin accounts for trusted individuals
   - Review the admin secret is only shared with authorized personnel

3. **Monitor user registrations**
   - Regularly check pending approvals
   - Verify user identities before approval
   - Reject suspicious accounts

## Troubleshooting

### Can't register admin

- **Error: "Invalid admin secret"**
  - Check that `ADMIN_REGISTRATION_SECRET` is set in `.env`
  - Verify you're using the exact secret value (no extra spaces)
  - Restart the server after changing `.env`

- **Error: "User with this email already exists"**
  - The email is already registered
  - Try a different email or check existing users in the database

### Migration issues

If the migration fails:

```bash
# Check if the columns already exist:
psql -U overwatch -d overwatch -c "\d users"

# If they don't exist, the migration should work
# If they do exist with different types, you may need to drop and recreate
```

### Can't see admin dashboard

- Make sure your user has `role = 'admin'` in the database:
  ```sql
  SELECT id, email, name, role, status FROM users WHERE email = 'your-email@example.com';
  ```

- If the role is 'user', update it manually:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
  ```

## API Endpoints

### Admin Registration
```
POST /api/auth/admin/register
Body: { email, password, name, adminSecret }
```

### User Registration (creates pending user)
```
POST /api/auth/signup
Body: { email, password, name }
```

### Login (only approved users)
```
POST /api/auth/login
Body: { email, password }
```

### Admin Endpoints (require admin JWT token)

Get pending users:
```
GET /api/auth/admin/pending-users
Header: Authorization: Bearer <admin-jwt-token>
```

Get all users:
```
GET /api/auth/admin/users
Header: Authorization: Bearer <admin-jwt-token>
```

Approve user:
```
POST /api/auth/admin/approve/:userId
Header: Authorization: Bearer <admin-jwt-token>
```

Reject user:
```
POST /api/auth/admin/reject/:userId
Header: Authorization: Bearer <admin-jwt-token>
```

## Database Schema Updates

The migration adds these columns to the `users` table:

```sql
- role: TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'))
- status: TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
```

Existing users are automatically set to `status = 'approved'` for backward compatibility.
