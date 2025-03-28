import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { log } from './vite';

// API Gateway provides a unified interface to the microservices
export class ApiGateway {
  private router: Router;
  private serviceRegistry: Map<string, string>;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.router = Router();
    this.serviceRegistry = new Map();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  public registerService(serviceName: string, serviceUrl: string): void {
    this.serviceRegistry.set(serviceName, serviceUrl);
    log(`Registered service: ${serviceName} at ${serviceUrl}`, 'api-gateway');
  }

  public startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, serviceUrl] of this.serviceRegistry.entries()) {
      try {
        const response = await axios.get(`${serviceUrl}/health`);
        if (response.status === 200 && response.data.status === 'ok') {
          log(`Health check passed for ${serviceName}`, 'api-gateway');
        } else {
          log(`Health check failed for ${serviceName}: Unexpected response`, 'api-gateway');
        }
      } catch (error) {
        log(`Health check failed for ${serviceName}: ${error.message}`, 'api-gateway');
      }
    }
  }

  private setupRoutes(): void {
    // Central request logging
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      log(`${req.method} ${req.path}`, 'api-gateway');
      next();
    });

    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', services: Array.from(this.serviceRegistry.keys()) });
    });

    // API Gateway routing
    this.router.use('/api/:service', async (req: Request, res: Response) => {
      const serviceName = req.params.service;
      const serviceUrl = this.serviceRegistry.get(serviceName);

      if (!serviceUrl) {
        return res.status(404).json({ message: `Service '${serviceName}' not found` });
      }

      try {
        // Remove the /api/:service part from the path
        const path = req.url.replace(`/api/${serviceName}`, '');
        const fullUrl = `${serviceUrl}${path}`;

        // Forward the request to the appropriate service
        const response = await axios({
          method: req.method as any,
          url: fullUrl,
          data: req.body,
          headers: {
            ...req.headers as any,
            host: undefined, // Remove host header to avoid conflicts
          },
          // Forward cookies and authentication information
          withCredentials: true
        });

        // Send the response back to the client
        res.status(response.status).json(response.data);
      } catch (error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          res.status(error.response.status).json(error.response.data);
        } else {
          // Something happened in setting up the request
          res.status(500).json({ message: `Error routing to '${serviceName}': ${error.message}` });
        }
      }
    });
  }
}

// Microservices Control Plane (MCP) manages the microservices
export class MicroservicesControlPlane {
  private apiGateway: ApiGateway;
  private servicesConfig: {
    name: string;
    url: string;
    enabled: boolean;
  }[];

  constructor(apiGateway: ApiGateway) {
    this.apiGateway = apiGateway;
    this.servicesConfig = [];
  }

  public configureServices(servicesConfig: { name: string; url: string; enabled: boolean }[]): void {
    this.servicesConfig = servicesConfig;
    this.registerEnabledServices();
  }

  public registerEnabledServices(): void {
    this.servicesConfig
      .filter(service => service.enabled)
      .forEach(service => {
        this.apiGateway.registerService(service.name, service.url);
      });
  }

  public enableService(serviceName: string): boolean {
    const service = this.servicesConfig.find(s => s.name === serviceName);
    if (service) {
      service.enabled = true;
      this.apiGateway.registerService(service.name, service.url);
      return true;
    }
    return false;
  }

  public disableService(serviceName: string): boolean {
    const service = this.servicesConfig.find(s => s.name === serviceName);
    if (service) {
      service.enabled = false;
      return true;
    }
    return false;
  }

  public getServiceStatus(): { name: string; url: string; enabled: boolean }[] {
    return [...this.servicesConfig];
  }
}

// Create and configure the API Gateway
export function createApiGateway(): ApiGateway {
  const apiGateway = new ApiGateway();
  return apiGateway;
}

// Create and configure the MCP
export function createMCP(apiGateway: ApiGateway): MicroservicesControlPlane {
  const mcp = new MicroservicesControlPlane(apiGateway);
  
  // Configure initial services - these will be running as part of the monolith for now
  // Later we can move them to separate microservices
  mcp.configureServices([
    { name: 'auth', url: 'http://localhost:5000/internal/auth', enabled: true },
    { name: 'tenants', url: 'http://localhost:5000/internal/tenants', enabled: true },
    { name: 'users', url: 'http://localhost:5000/internal/users', enabled: true },
    { name: 'plans', url: 'http://localhost:5000/internal/plans', enabled: true },
  ]);
  
  return mcp;
}