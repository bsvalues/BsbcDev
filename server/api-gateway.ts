import { Router, Request, Response, NextFunction } from 'express';
import axios, { AxiosError } from 'axios';
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

  // Track service health status
  private serviceHealth: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'unavailable';
    url: string;
    error?: string;
    lastChecked: Date;
  }> = [];

  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.serviceRegistry.entries()).map(async ([serviceName, serviceUrl]) => {
      try {
        // Add timeout to health checks
        const response = await axios.get(`${serviceUrl}/health`, {
          timeout: 2000 // 2 second timeout
        });
        
        if (response.status === 200 && response.data.status === 'ok') {
          log(`Health check passed for ${serviceName}`, 'api-gateway');
          return { 
            name: serviceName, 
            status: 'healthy' as const, 
            url: serviceUrl,
            lastChecked: new Date()
          };
        } else {
          log(`Health check failed for ${serviceName}: Unexpected response`, 'api-gateway');
          return { 
            name: serviceName, 
            status: 'unhealthy' as const, 
            url: serviceUrl,
            error: 'Unexpected response',
            lastChecked: new Date()
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Health check failed for ${serviceName}: ${errorMessage}`, 'api-gateway');
        return { 
          name: serviceName, 
          status: 'unavailable' as const, 
          url: serviceUrl,
          error: errorMessage,
          lastChecked: new Date()
        };
      }
    });
    
    this.serviceHealth = await Promise.all(healthPromises);
  }

  private setupRoutes(): void {
    // Central request logging
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      log(`${req.method} ${req.path}`, 'api-gateway');
      next();
    });

    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      const allServicesHealthy = this.serviceHealth.every(service => service.status === 'healthy');
      
      res.json({ 
        status: allServicesHealthy ? 'ok' : 'degraded',
        services: this.serviceHealth.length > 0 
          ? this.serviceHealth 
          : Array.from(this.serviceRegistry.keys()).map(name => ({
              name,
              status: 'unknown',
              url: this.serviceRegistry.get(name),
              lastChecked: null
            }))
      });
    });

    // API Gateway routing with advanced error handling and request timing
    this.router.use('/api/:service', async (req: Request, res: Response) => {
      const serviceName = req.params.service;
      const serviceUrl = this.serviceRegistry.get(serviceName);

      if (!serviceUrl) {
        return res.status(404).json({ 
          message: `Service '${serviceName}' not found`,
          error: 'SERVICE_NOT_FOUND',
          status: 404,
          timestamp: new Date().toISOString()
        });
      }

      // Check if the service is known to be unhealthy
      const serviceHealthStatus = this.serviceHealth.find(s => s.name === serviceName);
      if (serviceHealthStatus && serviceHealthStatus.status === 'unavailable') {
        log(`Request to unavailable service: ${serviceName}`, 'api-gateway');
        return res.status(503).json({
          message: `Service '${serviceName}' is currently unavailable`,
          error: 'SERVICE_UNAVAILABLE',
          status: 503,
          lastChecked: serviceHealthStatus.lastChecked,
          timestamp: new Date().toISOString()
        });
      }

      // Start timing the request
      const startTime = process.hrtime();

      try {
        // Remove the /api/:service part from the path
        const path = req.url.replace(`/api/${serviceName}`, '');
        const fullUrl = `${serviceUrl}${path}`;
        
        log(`Routing ${req.method} ${path} to ${serviceName}`, 'api-gateway');

        // Forward the request to the appropriate service with timeout
        const response = await axios({
          method: req.method as any,
          url: fullUrl,
          data: req.body,
          headers: {
            ...req.headers as any,
            host: undefined, // Remove host header to avoid conflicts
            'x-forwarded-for': req.ip || req.socket.remoteAddress,
            'x-forwarded-proto': req.protocol,
            'x-api-gateway': 'true'
          },
          timeout: 30000, // 30 second timeout for service requests
          // Forward cookies and authentication information
          withCredentials: true
        });

        // Calculate the request duration
        const hrTime = process.hrtime(startTime);
        const requestDuration = (hrTime[0] * 1000 + hrTime[1] / 1000000).toFixed(2);
        
        // Add response time header
        res.setHeader('X-Response-Time', `${requestDuration}ms`);
        
        // Log successful request
        log(`Service ${serviceName} responded in ${requestDuration}ms`, 'api-gateway');

        // Send the response back to the client
        res.status(response.status).json(response.data);
      } catch (error) {
        // Handle Axios errors
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(axiosError.response.status).json(axiosError.response.data);
          } else if (axiosError.request) {
            // The request was made but no response was received
            res.status(504).json({ 
              message: `Gateway Timeout: No response from '${serviceName}' service`,
              error: axiosError.message,
              timestamp: new Date().toISOString()
            });
          } else {
            // Something happened in setting up the request
            res.status(500).json({ 
              message: `Error configuring request to '${serviceName}' service`,
              error: axiosError.message,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          // Generic error handling
          const errorMessage = error instanceof Error ? error.message : String(error);
          res.status(500).json({ 
            message: `Error routing to '${serviceName}': ${errorMessage}`,
            timestamp: new Date().toISOString()
          });
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