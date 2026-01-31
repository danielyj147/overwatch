# Admin Registration & User Approval Implementation Summary

## Overview

Successfully implemented an admin registration system with user approval workflow for the Overwatch application.

## Changes Made

### 1. Database Changes

**File Created:** `db/migrations/006_add_user_roles_and_status.sql`

Added two new columns to the `users` table:
- `role` - TEXT (admin/user) - Determines user permissions
- `status` - TEXT (pending/approved/rejected) - User account status

Existing users are automatically set to "approved" status for backward compatibility.

### 2. Backend Changes

**File Modified:** `server/hocuspocus/src/routes/auth.ts`

Added/Modified endpoints:
- `POST /api/auth/admin/register` - Register admin with secret key
- `POST /api/auth/signup` - Modified to create pending users
- `POST /api/auth/login` - Modified to check approval status
- `GET /api/auth/verify` - Modified to include role and status
- `PUT /api/auth/profile` - Modified to include role in JWT
- `GET /api/auth/admin/pending-users` - List pending registrations (admin only)
- `GET /api/auth/admin/users` - List all users (admin only)
- `POST /api/auth/admin/approve/:userId` - Approve user (admin only)
- `POST /api/auth/admin/reject/:userId` - Reject user (admin only)

Key changes:
- Added `requireAdmin` middleware for admin-only endpoints
- JWT tokens now include `role` field
- Login checks for `approved` status before allowing access
- Signup creates users with `pending` status (no token returned)
- Admin registration requires `ADMIN_REGISTRATION_SECRET` environment variable

### 3. Frontend Changes

#### Store Updates

**File Modified:** `client/src/stores/authStore.ts`

- Updated `AuthUser` interface to include `role` and `status`
- Added `PendingUser` interface for admin dashboard
- Added `signupMessage` state for showing pending approval message
- Modified `signup()` to handle pending user response (no token)
- Added `adminRegister()` action for admin registration
- Added admin actions:
  - `getPendingUsers()` - Fetch pending users
  - `getAllUsers()` - Fetch all users
  - `approveUser(userId)` - Approve a user
  - `rejectUser(userId)` - Reject a user

#### Component Updates

**File Modified:** `client/src/components/Auth/AuthScreen.tsx`

- Added admin registration mode with Shield icon
- Added admin secret key input field
- Show success message for pending user signups
- Added "Register as Admin" button
- Handle three auth modes: login, signup, admin

**File Created:** `client/src/components/Admin/AdminDashboard.tsx`

New admin dashboard component featuring:
- Two tabs: "Pending Approvals" and "All Users"
- List pending users with approve/reject buttons
- Display all users with their roles and statuses
- Logout button
- Real-time loading states
- Color-coded status badges

**File Modified:** `client/src/App.tsx`

- Import AdminDashboard component
- Check user role after authentication
- Show AdminDashboard for admin users
- Show map interface for regular users

### 4. Configuration Changes

**Files Modified:**
- `.env.example` - Added `ADMIN_REGISTRATION_SECRET`
- `.env` - Added `ADMIN_REGISTRATION_SECRET` and `HOCUSPOCUS_HTTP_PORT`
- `server/hocuspocus/.env` - Added admin secret and HTTP port
- `client/.env` - Already correct (API URL points to port 1235)

### 5. Documentation

**File Created:** `SETUP_ADMIN.md`

Comprehensive setup guide covering:
- Initial setup steps
- Database migration instructions
- Admin registration methods
- Admin dashboard usage
- User registration flow
- Security best practices
- Troubleshooting guide
- API endpoint reference

**File Created:** `IMPLEMENTATION_SUMMARY.md` (this file)

## User Flows

### Admin Registration Flow
1. Navigate to login screen
2. Click "Register as Admin"
3. Enter display name, email, password, and admin secret
4. Submit registration
5. Immediately logged in with admin access
6. Redirected to Admin Dashboard

### Regular User Registration Flow
1. Navigate to login screen
2. Click "Sign up"
3. Enter display name, email, and password
4. Submit registration
5. See "Please wait for admin approval" message
6. Cannot log in until approved
7. After approval, can log in normally

### Admin User Approval Flow
1. Admin logs in
2. Views Admin Dashboard
3. Sees "Pending Approvals" tab with waiting users
4. Reviews user details
5. Clicks "Approve" or "Reject"
6. User status updated immediately

### Login Flow
1. User enters email and password
2. System checks credentials
3. System checks user status:
   - Pending: Show "account pending approval" error
   - Rejected: Show "account rejected" error
   - Approved: Generate token and log in
4. Admin users → Admin Dashboard
5. Regular users → Map Interface

## Security Features

1. **Admin Secret Protection**
   - Requires secret key for admin registration
   - Secret stored in environment variables
   - Not exposed to client

2. **Role-Based Access Control**
   - Admin role required for approval endpoints
   - JWT tokens include role information
   - Middleware validates admin access

3. **Status Validation**
   - Login prevented for pending/rejected users
   - Token verification checks current status
   - Status changes reflected immediately

4. **Password Security**
   - Passwords hashed with bcrypt (10 rounds)
   - Never stored or transmitted in plain text

## Technical Details

### Database Schema Updates

```sql
ALTER TABLE users
ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
```

### JWT Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "color": "#4ECDC4",
  "role": "admin|user"
}
```

### API Response Examples

**Successful Admin Registration:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "color": "#4ECDC4",
    "role": "admin",
    "status": "approved"
  }
}
```

**User Signup (Pending):**
```json
{
  "message": "Registration successful. Please wait for admin approval.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Regular User",
    "status": "pending"
  }
}
```

**Login Error (Pending):**
```json
{
  "error": "Your account is pending admin approval"
}
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Admin registration with correct secret works
- [ ] Admin registration with wrong secret fails
- [ ] Regular user signup creates pending user
- [ ] Pending users cannot log in
- [ ] Admin can see pending users list
- [ ] Admin can approve users
- [ ] Admin can reject users
- [ ] Approved users can log in
- [ ] Rejected users cannot log in
- [ ] Admin sees admin dashboard
- [ ] Regular users see map interface
- [ ] All users list shows correct data
- [ ] Logout works for admin users

## Next Steps

1. **Run Database Migration**
   ```bash
   psql -U overwatch -d overwatch -f db/migrations/006_add_user_roles_and_status.sql
   ```
   Or with Docker:
   ```bash
   docker-compose exec db psql -U overwatch -d overwatch < db/migrations/006_add_user_roles_and_status.sql
   ```

2. **Set Admin Secret**
   - Generate a secure random string
   - Add to `.env` file as `ADMIN_REGISTRATION_SECRET`

3. **Restart Server**
   ```bash
   docker-compose restart hocuspocus
   # or
   cd server/hocuspocus && npm run dev
   ```

4. **Register First Admin**
   - Navigate to application
   - Click "Register as Admin"
   - Use the admin secret from `.env`

5. **Test User Flow**
   - Create a test user account
   - Verify pending status
   - Approve via admin dashboard
   - Test login

## Files Changed

### Created:
- `db/migrations/006_add_user_roles_and_status.sql`
- `client/src/components/Admin/AdminDashboard.tsx`
- `SETUP_ADMIN.md`
- `IMPLEMENTATION_SUMMARY.md`

### Modified:
- `server/hocuspocus/src/routes/auth.ts`
- `client/src/stores/authStore.ts`
- `client/src/components/Auth/AuthScreen.tsx`
- `client/src/App.tsx`
- `.env.example`
- `.env`
- `server/hocuspocus/.env`

## Environment Variables

### Required New Variables:
```bash
# Admin registration secret (server)
ADMIN_REGISTRATION_SECRET=change-this-admin-secret-in-production

# HTTP port for auth API (should already exist)
HOCUSPOCUS_HTTP_PORT=1235
```

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/admin/register` | POST | None | Register admin with secret |
| `/api/auth/signup` | POST | None | Register user (pending) |
| `/api/auth/login` | POST | None | Login (approved only) |
| `/api/auth/verify` | GET | JWT | Verify token |
| `/api/auth/profile` | PUT | JWT | Update profile |
| `/api/auth/admin/pending-users` | GET | Admin JWT | List pending users |
| `/api/auth/admin/users` | GET | Admin JWT | List all users |
| `/api/auth/admin/approve/:userId` | POST | Admin JWT | Approve user |
| `/api/auth/admin/reject/:userId` | POST | Admin JWT | Reject user |

## Notes

- Backward compatibility maintained: existing users are set to "approved"
- Admin secret should be kept secure and not committed to version control
- JWT tokens now include role information for authorization
- Client correctly handles pending signup state (shows message, no token)
- Admin dashboard auto-refreshes after approve/reject actions
