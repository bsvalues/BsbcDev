import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { createError } from '../utils/error-handler';
import { z } from 'zod';
import { log } from '../vite';
import { MarketData, InsertMarketData } from '@shared/schema';

/**
 * Market Intelligence Service
 * Manages market data and provides market analysis
 */
export class MarketIntelligenceService {
  private router: Router;
  private repository: IStorage;

  constructor(repository: IStorage) {
    this.repository = repository;
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  /**
   * Retrieve market trends for a specific region and data type
   */
  public async getMarketTrends(
    region: string,
    regionType: string,
    dataType: string,
    tenantId: number,
    period: { start: Date, end: Date }
  ): Promise<Array<{ date: Date, value: number }>> {
    try {
      return this.repository.getMarketTrends(
        region,
        regionType,
        dataType,
        tenantId,
        period
      );
    } catch (error) {
      log(`Error retrieving market trends: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Calculate neighborhood score based on various factors
   */
  public async calculateNeighborhoodScore(
    zipCode: string,
    tenantId: number
  ): Promise<{ 
    overallScore: number,
    categories: {
      schools: number,
      safety: number,
      amenities: number,
      appreciation: number,
      affordability: number 
    }
  }> {
    try {
      // Get market data for this zip code
      const marketData = await this.repository.getMarketDataByRegion(
        zipCode,
        'zip',
        tenantId
      );
      
      // If no market data, return default score
      if (marketData.length === 0) {
        return {
          overallScore: 50,
          categories: {
            schools: 50,
            safety: 50,
            amenities: 50,
            appreciation: 50,
            affordability: 50
          }
        };
      }
      
      // Extract scores from market data
      const scores = {
        schools: this.extractCategoryScore(marketData, 'education_quality'),
        safety: this.extractCategoryScore(marketData, 'crime_index'),
        amenities: this.extractCategoryScore(marketData, 'amenities_access'),
        appreciation: this.extractCategoryScore(marketData, 'appreciation_rate'),
        affordability: this.extractCategoryScore(marketData, 'affordability_index')
      };
      
      // Calculate overall score as weighted average
      const weights = {
        schools: 0.25,
        safety: 0.25,
        amenities: 0.15,
        appreciation: 0.20,
        affordability: 0.15
      };
      
      const overallScore = Object.entries(scores).reduce(
        (score, [category, value]) => score + value * weights[category], 
        0
      );
      
      return {
        overallScore: Math.round(overallScore),
        categories: scores
      };
    } catch (error) {
      log(`Error calculating neighborhood score: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Extract a category score from market data
   */
  private extractCategoryScore(
    marketData: MarketData[],
    dataType: string
  ): number {
    // Find the specific data type
    const data = marketData.find(d => d.dataType === dataType);
    
    if (data && data.data && typeof data.data === 'object') {
      if ('score' in data.data) {
        return data.data.score;
      } else if ('value' in data.data) {
        // Normalize values to 0-100 scale using metadata if available
        if (data.metadata && data.metadata.min !== undefined && data.metadata.max !== undefined) {
          const { min, max } = data.metadata;
          return Math.round(((data.data.value - min) / (max - min)) * 100);
        }
        
        return data.data.value;
      }
    }
    
    // Default if not found
    return 50;
  }
  
  /**
   * Compare market performance of an area against benchmarks
   */
  public async compareMarketPerformance(
    region: string,
    regionType: string,
    tenantId: number,
    benchmarks: Array<{ region: string, regionType: string }>
  ): Promise<{
    region: { name: string, type: string },
    benchmarks: Array<{
      region: { name: string, type: string },
      comparison: {
        appreciation: { regionRate: number, benchmarkRate: number, difference: number },
        value: { regionMedian: number, benchmarkMedian: number, percentage: number }
      }
    }>
  }> {
    try {
      // Get primary region data
      const regionData = await this.repository.getMarketDataByRegion(
        region,
        regionType,
        tenantId
      );
      
      const regionMedianValue = this.extractMedianValue(regionData);
      const regionAppreciationRate = this.extractAppreciationRate(regionData);
      
      // Get benchmark data and make comparisons
      const benchmarkComparisons = [];
      
      for (const benchmark of benchmarks) {
        const benchmarkData = await this.repository.getMarketDataByRegion(
          benchmark.region,
          benchmark.regionType,
          tenantId
        );
        
        const benchmarkMedianValue = this.extractMedianValue(benchmarkData);
        const benchmarkAppreciationRate = this.extractAppreciationRate(benchmarkData);
        
        benchmarkComparisons.push({
          region: {
            name: benchmark.region,
            type: benchmark.regionType
          },
          comparison: {
            appreciation: {
              regionRate: regionAppreciationRate,
              benchmarkRate: benchmarkAppreciationRate,
              difference: regionAppreciationRate - benchmarkAppreciationRate
            },
            value: {
              regionMedian: regionMedianValue,
              benchmarkMedian: benchmarkMedianValue,
              percentage: benchmarkMedianValue > 0 
                ? (regionMedianValue / benchmarkMedianValue) * 100 
                : 100
            }
          }
        });
      }
      
      return {
        region: {
          name: region,
          type: regionType
        },
        benchmarks: benchmarkComparisons
      };
    } catch (error) {
      log(`Error comparing market performance: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Extract median value from market data
   */
  private extractMedianValue(marketData: MarketData[]): number {
    const medianValueData = marketData.find(d => d.dataType === 'median_home_value');
    
    if (medianValueData && medianValueData.data && typeof medianValueData.data === 'object') {
      if ('value' in medianValueData.data) {
        return medianValueData.data.value;
      }
    }
    
    // Default if not found
    return 0;
  }
  
  /**
   * Extract appreciation rate from market data
   */
  private extractAppreciationRate(marketData: MarketData[]): number {
    const appreciationData = marketData.find(d => d.dataType === 'appreciation_rate');
    
    if (appreciationData && appreciationData.data && typeof appreciationData.data === 'object') {
      if ('value' in appreciationData.data) {
        return appreciationData.data.value;
      }
    }
    
    // Default if not found
    return 0;
  }

  /**
   * Identify market trends from time series data
   */
  public identifyMarketTrends(
    timeSeries: Array<{ date: Date, value: number }>
  ): {
    trend: 'up' | 'down' | 'stable',
    annualizedRate: number,
    volatility: number,
    inflectionPoints: Array<{ date: Date, direction: 'up' | 'down' }>
  } {
    // Need at least two data points for trend analysis
    if (!timeSeries || timeSeries.length < 2) {
      return {
        trend: 'stable',
        annualizedRate: 0,
        volatility: 0,
        inflectionPoints: []
      };
    }
    
    // Sort by date (oldest to newest)
    const sortedData = [...timeSeries].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate overall percentage change
    const firstValue = sortedData[0].value;
    const lastValue = sortedData[sortedData.length - 1].value;
    const percentChange = ((lastValue - firstValue) / firstValue) * 100;
    
    // Calculate time difference in years
    const firstDate = sortedData[0].date;
    const lastDate = sortedData[sortedData.length - 1].date;
    const yearDiff = (lastDate.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Calculate annualized rate of change
    const annualizedRate = yearDiff > 0 
      ? (Math.pow((lastValue / firstValue), (1 / yearDiff)) - 1) * 100
      : 0;
    
    // Determine trend
    let trend: 'up' | 'down' | 'stable';
    
    if (Math.abs(annualizedRate) < 1) {
      trend = 'stable';
    } else if (annualizedRate > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }
    
    // Calculate volatility (standard deviation of percentage changes)
    const changes = [];
    for (let i = 1; i < sortedData.length; i++) {
      const prevValue = sortedData[i-1].value;
      const currValue = sortedData[i].value;
      changes.push((currValue - prevValue) / prevValue);
    }
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance) * 100; // Express as percentage
    
    // Identify inflection points (where trend changes)
    const inflectionPoints = [];
    let prevDirection = null;
    
    for (let i = 1; i < sortedData.length - 1; i++) {
      const prev = sortedData[i-1].value;
      const curr = sortedData[i].value;
      const next = sortedData[i+1].value;
      
      const prevDelta = curr - prev;
      const nextDelta = next - curr;
      
      // Check if direction changed
      const prevDir = prevDelta > 0 ? 'up' : prevDelta < 0 ? 'down' : 'stable';
      const nextDir = nextDelta > 0 ? 'up' : nextDelta < 0 ? 'down' : 'stable';
      
      if (prevDir !== nextDir && prevDir !== 'stable' && nextDir !== 'stable') {
        // This is an inflection point
        inflectionPoints.push({
          date: sortedData[i].date,
          direction: nextDir as 'up' | 'down'
        });
      }
    }
    
    return {
      trend,
      annualizedRate: parseFloat(annualizedRate.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      inflectionPoints
    };
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    // Get market data for region
    this.router.get('/data/:regionType/:region', async (req: Request, res: Response) => {
      try {
        const regionType = req.params.regionType;
        const region = req.params.region;
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const marketData = await this.repository.getMarketDataByRegion(
          region,
          regionType,
          tenantId
        );
        
        res.status(200).json(marketData);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Add market data
    this.router.post('/data', async (req: Request, res: Response) => {
      try {
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          dataSource: z.string().min(1),
          dataType: z.string().min(1),
          region: z.string().min(1),
          regionType: z.string().min(1),
          effectiveDate: z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "effectiveDate must be a valid date string"
          }),
          data: z.record(z.any()),
          metadata: z.record(z.any()).optional()
        });
        
        const body = schema.parse(req.body);
        
        // Create market data
        const marketData = await this.repository.createMarketData({
          ...body,
          tenantId,
          effectiveDate: new Date(body.effectiveDate)
        } as InsertMarketData);
        
        res.status(201).json(marketData);
      } catch (error) {
        if (error.name === 'ZodError') {
          res.status(400).json({ message: 'Invalid request data', details: error.errors });
        } else {
          res.status(error.status || 500).json({ 
            message: error.message || 'Internal server error' 
          });
        }
      }
    });

    // Get market trends
    this.router.get('/trends/:regionType/:region/:dataType', async (req: Request, res: Response) => {
      try {
        const regionType = req.params.regionType;
        const region = req.params.region;
        const dataType = req.params.dataType;
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate query parameters
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
          return res.status(400).json({ 
            message: 'Missing required query parameters: startDate, endDate' 
          });
        }
        
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ 
            message: 'Invalid date format for startDate or endDate' 
          });
        }
        
        const trends = await this.getMarketTrends(
          region,
          regionType,
          dataType,
          tenantId,
          { start, end }
        );
        
        // Identify trends
        const trendAnalysis = this.identifyMarketTrends(trends);
        
        res.status(200).json({
          data: trends,
          analysis: trendAnalysis
        });
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Get neighborhood score
    this.router.get('/neighborhood-score/:zipCode', async (req: Request, res: Response) => {
      try {
        const zipCode = req.params.zipCode;
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        const score = await this.calculateNeighborhoodScore(zipCode, tenantId);
        
        res.status(200).json(score);
      } catch (error) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });

    // Compare markets
    this.router.post('/compare/:regionType/:region', async (req: Request, res: Response) => {
      try {
        const regionType = req.params.regionType;
        const region = req.params.region;
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          benchmarks: z.array(z.object({
            region: z.string().min(1),
            regionType: z.string().min(1)
          })).min(1)
        });
        
        const body = schema.parse(req.body);
        
        const comparison = await this.compareMarketPerformance(
          region,
          regionType,
          tenantId,
          body.benchmarks
        );
        
        res.status(200).json(comparison);
      } catch (error) {
        if (error.name === 'ZodError') {
          res.status(400).json({ message: 'Invalid request data', details: error.errors });
        } else {
          res.status(error.status || 500).json({ 
            message: error.message || 'Internal server error' 
          });
        }
      }
    });
  }
}

export function createMarketIntelligenceService(repository: IStorage): MarketIntelligenceService {
  return new MarketIntelligenceService(repository);
}