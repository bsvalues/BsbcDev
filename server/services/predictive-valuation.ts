import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { createError } from '../utils/error-handler';
import { z } from 'zod';
import { log } from '../vite';
import { PropertyValuation } from '@shared/schema';

/**
 * Handles predictive valuation operations using various models and algorithms
 */
export class PredictiveValuationService {
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
   * Generate a predictive valuation for a property
   * Uses historical data to predict future value
   */
  public async generatePrediction(propertyId: number, tenantId: number, predictionDate: Date): Promise<PropertyValuation> {
    try {
      // Get property details
      const property = await this.repository.getProperty(propertyId, tenantId);
      if (!property) {
        throw createError('Property not found', 404, 'NOT_FOUND');
      }

      // Get historical valuations for the property
      const valuations = await this.repository.getAllPropertyValuations(propertyId, tenantId);
      
      // Sort valuations by date (oldest to newest)
      valuations.sort((a, b) => 
        a.assessmentDate.getTime() - b.assessmentDate.getTime()
      );
      
      // Calculate confidence score based on available data
      const confidenceScore = this.calculateConfidenceScore(valuations, predictionDate);
      
      // Determine which prediction model to use based on available data
      const predictionMethod = this.selectPredictionMethod(valuations);
      
      // Calculate the predicted value
      const prediction = this.calculatePrediction(
        property, 
        valuations, 
        predictionDate, 
        predictionMethod
      );
      
      // Calculate seasonal adjustment if applicable
      const seasonalAdjustment = this.calculateSeasonalAdjustment(
        valuations, 
        predictionDate
      );
      
      // Apply seasonal adjustment to prediction
      const assessedValue = Math.round(prediction.assessedValue * seasonalAdjustment);
      const marketValue = Math.round(prediction.marketValue * seasonalAdjustment);
      const taxableValue = Math.round(prediction.taxableValue * seasonalAdjustment);
      
      // Create a valuation object with the prediction
      return this.repository.createPropertyValuation({
        propertyId,
        tenantId,
        assessedValue,
        marketValue,
        taxableValue,
        assessmentDate: predictionDate,
        effectiveDate: predictionDate,
        valuationMethod: 'predictive_model',
        assessorId: 1, // System ID
        status: 'draft',
        notes: `Predictive valuation generated using ${predictionMethod.method} model`,
        valuationFactors: prediction.factors,
        confidenceScore,
        predictedChange: prediction.annualChangeRate * 100, // Convert to percentage
        seasonalAdjustment,
        predictionModels: predictionMethod
      });
    } catch (error) {
      log(`Error generating prediction: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Calculate a confidence score (0-100) based on available data
   */
  private calculateConfidenceScore(
    valuations: PropertyValuation[], 
    predictionDate: Date
  ): number {
    // Base factors for confidence calculation
    let baseScore = 0;
    
    // Factor 1: Number of historical valuations
    // Each valuation adds up to 30 points (capped)
    const historyFactor = Math.min(valuations.length * 10, 30);
    baseScore += historyFactor;
    
    // Factor 2: Time span of historical data (up to 30 points)
    let timeSpanMonths = 0;
    if (valuations.length >= 2) {
      const oldestDate = valuations[0].assessmentDate;
      const newestDate = valuations[valuations.length - 1].assessmentDate;
      timeSpanMonths = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      baseScore += Math.min(timeSpanMonths / 2, 30); // 2 years (24 months) gets full 30 points
    }
    
    // Factor 3: Distance to prediction date (up to 20 points)
    // Further in future = lower confidence
    if (valuations.length > 0) {
      const lastValuationDate = valuations[valuations.length - 1].assessmentDate;
      const monthsToPrediction = (predictionDate.getTime() - lastValuationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const distancePenalty = Math.min(monthsToPrediction * 0.5, 20); // Lose up to 20 points
      baseScore -= distancePenalty;
    }
    
    // Factor 4: Consistency of historical data (up to 20 points)
    if (valuations.length >= 3) {
      // Calculate coefficient of variation of year-over-year changes
      const changes = [];
      for (let i = 1; i < valuations.length; i++) {
        const prevValue = valuations[i-1].assessedValue;
        const currValue = valuations[i].assessedValue;
        changes.push((currValue - prevValue) / prevValue);
      }
      
      // Calculate average and std deviation of changes
      const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
      const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
      const stdDev = Math.sqrt(variance);
      
      // Lower coefficient of variation = more consistent = higher score
      const consistencyScore = stdDev < 0.01 ? 20 : Math.max(0, 20 - (stdDev / avgChange) * 100);
      baseScore += consistencyScore;
    }
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }
  
  /**
   * Select the appropriate prediction method based on available data
   */
  private selectPredictionMethod(valuations: PropertyValuation[]): any {
    if (valuations.length >= 5) {
      // Enough data for sophisticated models
      return {
        method: 'time_series_analysis',
        algorithm: 'linear_regression_with_seasonal',
        dataPoints: valuations.length
      };
    } else if (valuations.length >= 3) {
      // Use simpler model with less data
      return {
        method: 'linear_trend',
        algorithm: 'least_squares_fit',
        dataPoints: valuations.length
      };
    } else if (valuations.length === 2) {
      // Use direct extrapolation with only 2 data points
      return {
        method: 'simple_extrapolation',
        algorithm: 'direct_projection',
        dataPoints: 2
      };
    } else {
      // Not enough data for prediction
      return {
        method: 'limited_data',
        algorithm: 'market_average_growth',
        dataPoints: valuations.length
      };
    }
  }
  
  /**
   * Calculate predicted values using the selected method
   */
  private calculatePrediction(
    property: any, 
    valuations: PropertyValuation[], 
    predictionDate: Date,
    predictionMethod: any
  ): any {
    // Default values if prediction fails
    let predictedAssessedValue = property.lastAssessedValue || 0;
    let predictedMarketValue = predictedAssessedValue * 1.05; // 5% higher by default
    let predictedTaxableValue = predictedAssessedValue;
    let annualChangeRate = 0.03; // Default 3% per year
    
    // Apply different prediction methods based on available data
    switch (predictionMethod.method) {
      case 'time_series_analysis':
        return this.timeSeriesAnalysis(property, valuations, predictionDate);
        
      case 'linear_trend':
        return this.linearTrendAnalysis(property, valuations, predictionDate);
        
      case 'simple_extrapolation':
        return this.simpleExtrapolation(property, valuations, predictionDate);
        
      case 'limited_data':
        return this.limitedDataEstimate(property, valuations, predictionDate);
        
      default:
        // Return default prediction
        return {
          assessedValue: predictedAssessedValue,
          marketValue: predictedMarketValue,
          taxableValue: predictedTaxableValue,
          annualChangeRate,
          factors: {
            method: 'default',
            defaultRate: annualChangeRate
          }
        };
    }
  }
  
  /**
   * Time series analysis for properties with ample historical data
   */
  private timeSeriesAnalysis(
    property: any, 
    valuations: PropertyValuation[], 
    predictionDate: Date
  ): any {
    // Extract values and dates from historical valuations
    const values = valuations.map(v => v.assessedValue);
    const dates = valuations.map(v => v.assessmentDate.getTime());
    
    // Calculate linear regression coefficients (y = mx + b)
    const n = values.length;
    const sumX = dates.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = dates.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = dates.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate predicted value
    const timeDiff = predictionDate.getTime() - dates[0];
    const predictedAssessedValue = Math.round(slope * predictionDate.getTime() + intercept);
    
    // Calculate annual change rate
    const yearInMs = 365 * 24 * 60 * 60 * 1000;
    const annualChangeRate = (slope * yearInMs) / (values[0] || 1);
    
    // Typically market value is slightly higher than assessed value
    const marketValueMultiplier = this.calculateMarketValueMultiplier(valuations);
    const predictedMarketValue = Math.round(predictedAssessedValue * marketValueMultiplier);
    
    // Calculate prediction residuals for confidence analysis
    const residuals = valuations.map((v, i) => {
      const predicted = slope * dates[i] + intercept;
      return (v.assessedValue - predicted) / v.assessedValue;
    });
    
    // Mean absolute percentage error
    const mape = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / residuals.length;
    
    return {
      assessedValue: predictedAssessedValue,
      marketValue: predictedMarketValue,
      taxableValue: predictedAssessedValue, // Usually the same as assessed
      annualChangeRate,
      factors: {
        method: 'time_series_regression',
        slope,
        intercept,
        mape,
        r2: this.calculateR2(values, dates, slope, intercept),
        residuals
      }
    };
  }
  
  /**
   * Linear trend analysis for properties with moderate historical data
   */
  private linearTrendAnalysis(
    property: any, 
    valuations: PropertyValuation[], 
    predictionDate: Date
  ): any {
    // Calculate average annual change
    const changes = [];
    for (let i = 1; i < valuations.length; i++) {
      const prevValue = valuations[i-1].assessedValue;
      const currValue = valuations[i].assessedValue;
      const yearDiff = (valuations[i].assessmentDate.getTime() - valuations[i-1].assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      changes.push((currValue - prevValue) / prevValue / yearDiff);
    }
    
    // Calculate average annual change rate
    const annualChangeRate = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    
    // Get most recent valuation
    const mostRecent = valuations[valuations.length - 1];
    
    // Calculate years between most recent valuation and prediction date
    const yearDiff = (predictionDate.getTime() - mostRecent.assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Compound growth formula
    const predictedAssessedValue = Math.round(mostRecent.assessedValue * Math.pow(1 + annualChangeRate, yearDiff));
    const predictedMarketValue = Math.round(mostRecent.marketValue * Math.pow(1 + annualChangeRate, yearDiff));
    const predictedTaxableValue = Math.round(mostRecent.taxableValue * Math.pow(1 + annualChangeRate, yearDiff));
    
    return {
      assessedValue: predictedAssessedValue,
      marketValue: predictedMarketValue,
      taxableValue: predictedTaxableValue,
      annualChangeRate,
      factors: {
        method: 'linear_trend',
        annualRates: changes,
        averageAnnualRate: annualChangeRate,
        yearDifference: yearDiff
      }
    };
  }
  
  /**
   * Simple extrapolation for properties with minimal historical data
   */
  private simpleExtrapolation(
    property: any, 
    valuations: PropertyValuation[], 
    predictionDate: Date
  ): any {
    // With only two data points, use simple linear extrapolation
    const older = valuations[0];
    const newer = valuations[1];
    
    // Calculate time difference in years
    const timeDiff = (newer.assessmentDate.getTime() - older.assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Calculate annual change rate
    const annualChangeRate = (newer.assessedValue - older.assessedValue) / older.assessedValue / timeDiff;
    
    // Calculate years from newer valuation to prediction date
    const yearsToPrediction = (predictionDate.getTime() - newer.assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Apply compound growth formula
    const predictedAssessedValue = Math.round(newer.assessedValue * Math.pow(1 + annualChangeRate, yearsToPrediction));
    const predictedMarketValue = Math.round(newer.marketValue * Math.pow(1 + annualChangeRate, yearsToPrediction));
    const predictedTaxableValue = Math.round(newer.taxableValue * Math.pow(1 + annualChangeRate, yearsToPrediction));
    
    return {
      assessedValue: predictedAssessedValue,
      marketValue: predictedMarketValue,
      taxableValue: predictedTaxableValue,
      annualChangeRate,
      factors: {
        method: 'simple_extrapolation',
        olderValue: older.assessedValue,
        newerValue: newer.assessedValue,
        observedChangeRate: annualChangeRate,
        yearsToPrediction
      }
    };
  }
  
  /**
   * Limited data estimate for properties with insufficient historical data
   */
  private limitedDataEstimate(
    property: any, 
    valuations: PropertyValuation[], 
    predictionDate: Date
  ): any {
    // Use either the property's last assessment or a default growth rate
    const mostRecent = valuations.length > 0 
      ? valuations[valuations.length - 1] 
      : { 
          assessedValue: property.lastAssessedValue || 0, 
          marketValue: (property.lastAssessedValue || 0) * 1.05,
          taxableValue: property.lastAssessedValue || 0,
          assessmentDate: property.lastAssessedDate || new Date()
        };
    
    // Default average growth rate for the property type
    const defaultGrowthRates = {
      'residential': 0.035, // 3.5% per year
      'commercial': 0.030,  // 3.0% per year
      'industrial': 0.025,  // 2.5% per year
      'agricultural': 0.02, // 2.0% per year
      'default': 0.03       // 3.0% per year
    };
    
    const annualChangeRate = defaultGrowthRates[property.propertyType] || defaultGrowthRates.default;
    
    // Calculate years from most recent valuation to prediction date
    const yearsToPrediction = (predictionDate.getTime() - mostRecent.assessmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    
    // Apply compound growth formula
    const predictedAssessedValue = Math.round(mostRecent.assessedValue * Math.pow(1 + annualChangeRate, yearsToPrediction));
    const predictedMarketValue = Math.round(mostRecent.marketValue * Math.pow(1 + annualChangeRate, yearsToPrediction));
    const predictedTaxableValue = Math.round(mostRecent.taxableValue * Math.pow(1 + annualChangeRate, yearsToPrediction));
    
    return {
      assessedValue: predictedAssessedValue,
      marketValue: predictedMarketValue,
      taxableValue: predictedTaxableValue,
      annualChangeRate,
      factors: {
        method: 'limited_data',
        lastKnownValue: mostRecent.assessedValue,
        defaultGrowthRate: annualChangeRate,
        propertyType: property.propertyType,
        yearsToPrediction
      }
    };
  }
  
  /**
   * Calculate seasonal adjustment factor
   */
  private calculateSeasonalAdjustment(
    valuations: PropertyValuation[], 
    predictionDate: Date
  ): number {
    // Default: no seasonal adjustment
    if (valuations.length < 4) {
      return 1.0;
    }
    
    // Create month-based seasonal indices
    const monthIndices = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);
    
    // Calculate average value by month
    for (let i = 0; i < valuations.length; i++) {
      const month = valuations[i].assessmentDate.getMonth();
      monthIndices[month] += valuations[i].assessedValue;
      monthCounts[month]++;
    }
    
    // Calculate average for each month
    for (let i = 0; i < 12; i++) {
      if (monthCounts[i] > 0) {
        monthIndices[i] = monthIndices[i] / monthCounts[i];
      } else {
        // If no data for this month, use average
        const sum = monthIndices.reduce((a, b) => a + b, 0);
        const count = monthCounts.reduce((a, b) => a + b, 0);
        monthIndices[i] = sum / count;
      }
    }
    
    // Normalize indices (average = 1.0)
    const avgIndex = monthIndices.reduce((a, b) => a + b, 0) / 12;
    const normalizedIndices = monthIndices.map(val => val / avgIndex);
    
    // Get seasonal factor for prediction month
    const predictionMonth = predictionDate.getMonth();
    return normalizedIndices[predictionMonth];
  }
  
  /**
   * Calculate market value multiplier based on historical data
   */
  private calculateMarketValueMultiplier(valuations: PropertyValuation[]): number {
    // Default multiplier
    const defaultMultiplier = 1.05; // 5% higher than assessed value
    
    if (valuations.length === 0) {
      return defaultMultiplier;
    }
    
    // Calculate average ratio from historical data
    const ratios = valuations.map(v => v.marketValue / v.assessedValue);
    const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    
    return isNaN(avgRatio) || avgRatio <= 0 ? defaultMultiplier : avgRatio;
  }
  
  /**
   * Calculate R-squared value for regression model
   */
  private calculateR2(values: number[], dates: number[], slope: number, intercept: number): number {
    // Calculate mean of observed values
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate total sum of squares
    const totalSS = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    
    // Calculate residual sum of squares
    const residualSS = values.reduce((sum, val, i) => {
      const predicted = slope * dates[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    // Calculate R-squared
    return 1 - (residualSS / totalSS);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    // Generate prediction endpoint
    this.router.post('/predict/:propertyId', async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.propertyId);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Validate request body
        const schema = z.object({
          predictionDate: z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "predictionDate must be a valid date string"
          })
        });
        
        const body = schema.parse(req.body);
        const predictionDate = new Date(body.predictionDate);
        
        // Generate prediction
        const prediction = await this.generatePrediction(propertyId, tenantId, predictionDate);
        
        res.status(200).json(prediction);
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

export function createPredictiveValuationService(repository: IStorage): PredictiveValuationService {
  return new PredictiveValuationService(repository);
}