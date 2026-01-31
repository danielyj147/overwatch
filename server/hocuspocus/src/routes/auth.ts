import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const router = Router();

// Color palette for user avatars
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function createAuthRouter(pool: Pool, jwtSecret: string) {
  // Admin registration endpoint (requires admin secret key)
  router.post('/admin/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name, adminSecret } = req.body;

      if (!email || !password || !name || !adminSecret) {
        return res.status(400).json({ error: 'Email, password, name, and admin secret are required' });
      }

      // Verify admin secret from environment
      const expectedSecret = process.env.ADMIN_REGISTRATION_SECRET || 'change-this-in-production';
      if (adminSecret !== expectedSecret) {
        return res.status(403).json({ error: 'Invalid admin secret' });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const color = getRandomColor();

      // Create admin user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, color, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'admin', 'approved', NOW(), NOW())
         RETURNING id, email, name, color, role, status, created_at`,
        [email.toLowerCase(), passwordHash, name, color]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      console.log(`[Auth] Admin registered: ${user.email}`);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('[Auth] Admin registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Regular user signup endpoint (creates pending user)
  router.post('/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const color = getRandomColor();

      // Create user with pending status
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, color, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'user', 'pending', NOW(), NOW())
         RETURNING id, email, name, color, role, status, created_at`,
        [email.toLowerCase(), passwordHash, name, color]
      );

      const user = result.rows[0];

      console.log(`[Auth] User registration pending approval: ${user.email}`);

      res.status(201).json({
        message: 'Registration successful. Please wait for admin approval.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login endpoint (only approved users can login)
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const result = await pool.query(
        'SELECT id, email, password_hash, name, color, role, status FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check user status
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending admin approval' });
      }

      if (user.status === 'rejected') {
        return res.status(403).json({ error: 'Your account has been rejected' });
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      console.log(`[Auth] User logged in: ${user.email} (${user.role})`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify token endpoint
  router.get('/verify', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);

      const decoded = jwt.verify(token, jwtSecret) as {
        userId: string;
        email: string;
        name: string;
        color: string;
        role?: string;
      };

      // Verify user still exists and get current status
      const result = await pool.query(
        'SELECT id, email, name, color, role, status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      // Check if user is still approved
      if (user.status !== 'approved') {
        return res.status(403).json({ error: 'User account is not approved' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('[Auth] Verify error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update profile endpoint
  router.put('/profile', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; role?: string };

      const { name, color } = req.body;

      const updates: string[] = [];
      const values: (string | null)[] = [];
      let paramIndex = 1;

      if (name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (color) {
        updates.push(`color = $${paramIndex++}`);
        values.push(color);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(decoded.userId);

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, color, role`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      // Generate new token with updated info
      const newToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
          role: user.role,
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('[Auth] Profile update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Middleware to check admin role
  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; role?: string };

      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      (req as any).userId = decoded.userId;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get all pending users (admin only)
  router.get('/admin/pending-users', requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, email, name, color, created_at, status
         FROM users
         WHERE status = 'pending'
         ORDER BY created_at ASC`
      );

      res.json({
        users: result.rows,
      });
    } catch (error) {
      console.error('[Auth] Get pending users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all users (admin only)
  router.get('/admin/users', requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, email, name, color, role, status, created_at, last_login_at
         FROM users
         ORDER BY created_at DESC`
      );

      res.json({
        users: result.rows,
      });
    } catch (error) {
      console.error('[Auth] Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Approve user (admin only)
  router.post('/admin/approve/:userId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const result = await pool.query(
        `UPDATE users
         SET status = 'approved', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, email, name, status`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found or already processed' });
      }

      const user = result.rows[0];
      console.log(`[Auth] User approved by admin: ${user.email}`);

      res.json({
        message: 'User approved successfully',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('[Auth] Approve user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Reject user (admin only)
  router.post('/admin/reject/:userId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const result = await pool.query(
        `UPDATE users
         SET status = 'rejected', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, email, name, status`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found or already processed' });
      }

      const user = result.rows[0];
      console.log(`[Auth] User rejected by admin: ${user.email}`);

      res.json({
        message: 'User rejected successfully',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('[Auth] Reject user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
