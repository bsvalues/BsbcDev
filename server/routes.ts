import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTenantSchema, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import createMemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  const MemoryStore = createMemoryStore(session);

  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "bsbc-dev-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auto-login middleware for development
  app.use((req, res, next) => {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DEV_AUTO_LOGIN === "true" &&
      !req.isAuthenticated()
    ) {
      req.login({ id: 1 }, (err) => {
        if (err) {
          return next(err);
        }
        next();
      });
    } else {
      next();
    }
  });

  // Auth check middleware
  const authCheck = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // User routes
  app.get("/api/users/current", authCheck, (req, res) => {
    res.json(req.user);
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Tenant routes
  app.get("/api/tenants", authCheck, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", authCheck, async (req, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);
      const existingTenant = await storage.getTenantByDomain(tenantData.domain);
      
      if (existingTenant) {
        return res.status(400).json({ message: "Domain already exists" });
      }
      
      const tenant = await storage.createTenant(tenantData);
      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Plan routes
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // Environment check route
  app.get("/api/env", (req, res) => {
    res.json({
      environment: process.env.NODE_ENV || "development",
      devAutoLogin: process.env.DEV_AUTO_LOGIN === "true",
      devUserId: process.env.DEV_USER_ID || "1"
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
