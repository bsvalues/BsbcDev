import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler, notFoundHandler } from "./utils/error-handler";
import { requestLogger } from "./middleware/request-logger";

// Set environment to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  log('NODE_ENV not set, defaulting to development mode');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply the enhanced request logger middleware
app.use(requestLogger);

(async () => {
  const server = await registerRoutes(app);

  // Use the centralized error handler middleware
  app.use(errorHandler);
  
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Add 404 handler for routes that don't match any defined routes
  // This should be AFTER Vite/static file middleware so it doesn't catch frontend routes
  app.use(notFoundHandler);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
