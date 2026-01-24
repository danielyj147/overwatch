import { Extension, onAuthenticatePayload } from '@hocuspocus/server';

interface TokenPayload {
  userId: string;
  userName: string;
  userColor: string;
  permissions?: string[];
}

/**
 * Authentication extension for Hocuspocus
 * Validates JWT tokens and attaches user info to connection context
 */
export class AuthExtension implements Extension {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  async onAuthenticate(data: onAuthenticatePayload): Promise<TokenPayload> {
    const { token, documentName } = data;

    // Development mode: allow simple token format
    // Format: "userId:userName:userColor" or full JWT
    // Default to dev mode unless explicitly set to production
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      if (token && token.includes(':')) {
        const [userId, userName, userColor] = token.split(':');
        console.log(`[Auth] Dev mode - User authenticated: ${userName} for ${documentName}`);
        return {
          userId: userId || 'anonymous',
          userName: userName || 'Anonymous User',
          userColor: userColor || this.generateColor(),
        };
      }

      // Allow anonymous connections in development
      if (!token) {
        const anonymousUser = {
          userId: `anon-${Date.now()}`,
          userName: 'Anonymous',
          userColor: this.generateColor(),
        };
        console.log(`[Auth] Dev mode - Anonymous user connected to ${documentName}`);
        return anonymousUser;
      }
    }

    // Production mode: validate JWT
    try {
      const payload = this.verifyToken(token);
      console.log(`[Auth] User authenticated: ${payload.userName} for ${documentName}`);
      return payload;
    } catch (error) {
      console.error(`[Auth] Authentication failed for ${documentName}:`, error);
      throw new Error('Authentication failed');
    }
  }

  private verifyToken(token: string | undefined): TokenPayload {
    if (!token) {
      throw new Error('No token provided');
    }

    // Simple base64 token verification for now
    // In production, use proper JWT verification with jsonwebtoken
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded) as TokenPayload;

      if (!payload.userId || !payload.userName) {
        throw new Error('Invalid token payload');
      }

      return {
        ...payload,
        userColor: payload.userColor || this.generateColor(),
      };
    } catch {
      throw new Error('Invalid token format');
    }
  }

  private generateColor(): string {
    // Generate a random color from a palette of distinct colors
    const colors = [
      '#E57373', '#F06292', '#BA68C8', '#9575CD',
      '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
      '#4DB6AC', '#81C784', '#AED581', '#DCE775',
      '#FFF176', '#FFD54F', '#FFB74D', '#FF8A65',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
