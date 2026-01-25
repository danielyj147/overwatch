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
  // Signup endpoint
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

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, color, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, email, name, color, created_at`,
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
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      console.log(`[Auth] User signed up: ${user.email}`);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
        },
      });
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login endpoint
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const result = await pool.query(
        'SELECT id, email, password_hash, name, color FROM users WHERE email = $1',
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
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      console.log(`[Auth] User logged in: ${user.email}`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
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
      };

      // Optionally verify user still exists
      const result = await pool.query(
        'SELECT id, email, name, color FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          color: user.color,
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
      const decoded = jwt.verify(token, jwtSecret) as { userId: string };

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
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, color`,
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

  return router;
}
