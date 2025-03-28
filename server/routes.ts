import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupServices } from "./services-integration";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  try {
    // Set up microservices and API gateway
    await setupServices(app, httpServer);
    log("Services and API gateway initialized successfully", "routes");
  } catch (error: any) {
    log(`Error initializing services: ${error.message}`, "routes");
  }

  return httpServer;
}
