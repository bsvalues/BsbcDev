import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { log } from '../vite';

/**
 * Auth check middleware
 */
const authCheck = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

export class UserService {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ 
        status: 'ok'
      });
    });

    // Get current user
    this.router.get('/current', authCheck, (req, res) => {
      res.json(req.user);
    });

    // Get user by ID
    this.router.get('/:id', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const user = await storage.getUser(id);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
      } catch (error) {
        log(`Error fetching user: ${error.message}`, 'user-service');
        res.status(500).json({ message: 'Failed to fetch user' });
      }
    });

    // Create user
    this.router.post('/', async (req, res) => {
      try {
        const userData = insertUserSchema.parse(req.body);
        const existingUser = await storage.getUserByUsername(userData.username);
        
        if (existingUser) {
          log(`User creation failed: Username '${userData.username}' already exists`, 'user-service');
          return res.status(400).json({ message: 'Username already exists' });
        }
        
        const user = await storage.createUser(userData);
        log(`User created: ${user.username}`, 'user-service');
        res.status(201).json(user);
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          log(`Validation error during user creation: ${validationError.message}`, 'user-service');
          res.status(400).json({ message: validationError.message });
        } else {
          log(`Error creating user: ${error.message}`, 'user-service');
          res.status(500).json({ message: 'Internal server error' });
        }
      }
    });

    // Update user password - for user profile settings
    this.router.patch('/:id/password', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const { currentPassword, newPassword } = req.body;
        
        // Check if the user ID matches the authenticated user or is an admin
        if ((req.user as any).id !== id && (req.user as any).role !== 'admin') {
          return res.status(403).json({ message: 'Forbidden - you can only change your own password' });
        }
        
        // Get the user
        const user = await storage.getUser(id);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        if (user.password !== currentPassword) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Update the password
        // In a real application, we'd use proper password hashing
        const updatedUser = await storage.updateUser(id, { password: newPassword });
        log(`Password updated for user ${id}`, 'user-service');
        
        res.json({ message: 'Password updated successfully' });
      } catch (error) {
        log(`Error updating password: ${error.message}`, 'user-service');
        res.status(500).json({ message: 'Failed to update password' });
      }
    });

    // Update user profile
    this.router.patch('/:id/profile', authCheck, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        
        // Check if the user ID matches the authenticated user or is an admin
        if ((req.user as any).id !== id && (req.user as any).role !== 'admin') {
          return res.status(403).json({ message: 'Forbidden - you can only update your own profile' });
        }
        
        // Only allow updating certain fields
        const { email, displayName, preferences } = req.body;
        const updateData = { email, displayName, preferences };
        
        // Filter out undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        // Check if user exists
        const existingUser = await storage.getUser(id);
        if (!existingUser) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Update the user
        const updatedUser = await storage.updateUser(id, updateData);
        log(`Profile updated for user ${id}`, 'user-service');
        res.json(updatedUser);
      } catch (error) {
        log(`Error updating profile: ${error.message}`, 'user-service');
        res.status(500).json({ message: 'Failed to update profile' });
      }
    });
  }
}

export function createUserService(): UserService {
  return new UserService();
}