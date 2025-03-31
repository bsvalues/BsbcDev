import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { log } from '../vite';
import { hashPassword, comparePassword, needsPasswordMigration } from '../utils/password-utils';
import { formatError } from '../utils/error-handler';

export class AuthService {
  private router: Router;
  private passport: any;
  private isAutoLoginEnabled: boolean;

  constructor(passport: any) {
    this.router = Router();
    this.passport = passport;
    this.isAutoLoginEnabled = process.env.DEV_AUTO_LOGIN === 'true';
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  public enableAutoLogin(): void {
    this.isAutoLoginEnabled = true;
    log('Auto-login feature enabled', 'auth-service');
  }

  public disableAutoLogin(): void {
    this.isAutoLoginEnabled = false;
    log('Auto-login feature disabled', 'auth-service');
  }

  private autoLoginMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (
      process.env.NODE_ENV === 'development' &&
      this.isAutoLoginEnabled &&
      !req.isAuthenticated()
    ) {
      const devUserId = parseInt(process.env.DEV_USER_ID || '1', 10);
      log(`Auto-login attempted with user ID: ${devUserId}`, 'auth-service');
      
      req.login({ id: devUserId }, (err) => {
        if (err) {
          log(`Auto-login failed: ${err.message}`, 'auth-service');
          return next(err);
        }
        log(`Auto-login successful for user ID: ${devUserId}`, 'auth-service');
        next();
      });
    } else {
      next();
    }
  }

  private setupRoutes(): void {
    // Apply auto-login middleware to all routes
    this.router.use((req, res, next) => this.autoLoginMiddleware(req, res, next));

    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        autoLoginEnabled: this.isAutoLoginEnabled,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Login endpoint
    this.router.post('/login', this.passport.authenticate('local'), (req, res) => {
      log(`Login successful for user: ${(req.user as any)?.username || 'unknown'}`, 'auth-service');
      res.json({ message: 'Login successful', user: req.user });
    });

    // Logout endpoint
    this.router.post('/logout', (req, res) => {
      const username = (req.user as any)?.username || 'unknown';
      req.logout(() => {
        log(`Logout successful for user: ${username}`, 'auth-service');
        res.json({ message: 'Logout successful' });
      });
    });

    // Authentication status endpoint
    this.router.get('/status', (req, res) => {
      if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
      } else {
        res.json({ authenticated: false });
      }
    });

    // Create user endpoint (typically for registration)
    this.router.post('/register', async (req, res) => {
      try {
        const userData = insertUserSchema.parse(req.body);
        const existingUser = await storage.getUserByUsername(userData.username);
        
        if (existingUser) {
          log(`Registration failed: Username '${userData.username}' already exists`, 'auth-service');
          return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Hash the password before storing
        const hashedPassword = await hashPassword(userData.password);
        
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword
        });
        
        // Create a sanitized user response without the password
        const { password: _, ...userResponse } = user;
        
        log(`User created: ${user.username}`, 'auth-service');
        res.status(201).json(userResponse);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error during registration: ${formattedError.message}`, 'auth-service');
        res.status(formattedError.status).json(formattedError);
      }
    });

    // Auto-login configuration endpoint
    this.router.post('/autologin/config', (req, res) => {
      const { enabled, userId } = req.body;
      
      if (typeof enabled === 'boolean') {
        this.isAutoLoginEnabled = enabled;
        process.env.DEV_AUTO_LOGIN = enabled ? 'true' : 'false';
      }
      
      if (userId && !isNaN(parseInt(userId))) {
        process.env.DEV_USER_ID = userId.toString();
      }
      
      log(`Auto-login config updated: enabled=${this.isAutoLoginEnabled}, userId=${process.env.DEV_USER_ID}`, 'auth-service');
      
      res.json({
        message: 'Auto-login configuration updated',
        config: {
          enabled: this.isAutoLoginEnabled,
          userId: process.env.DEV_USER_ID
        }
      });
    });

    // Development user creation endpoint
    this.router.post('/dev-user', async (req, res) => {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'This endpoint is only available in development mode' });
      }

      try {
        const { username, email, password, role, isDevUser } = req.body;
        
        if (!username || !email || !password) {
          return res.status(400).json({ message: 'Username, email, and password are required' });
        }
        
        const existingUser = await storage.getUserByUsername(username);
        
        if (existingUser) {
          log(`Dev user creation failed: Username '${username}' already exists`, 'auth-service');
          return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Hash the password before storing
        const hashedPassword = await hashPassword(password);
        
        const userData = {
          username,
          email,
          password: hashedPassword,
          role: role || 'user',
          isDevUser: isDevUser === true
        };
        
        const user = await storage.createUser(userData);
        
        // Create a sanitized user response without the password
        const { password: _, ...userResponse } = user;
        
        log(`Development user created: ${user.username}`, 'auth-service');
        res.status(201).json(userResponse);
      } catch (error: any) {
        const formattedError = formatError(error);
        log(`Error creating development user: ${formattedError.message}`, 'auth-service');
        res.status(formattedError.status).json(formattedError);
      }
    });
  }
}

export function createAuthService(passport: any): AuthService {
  return new AuthService(passport);
}