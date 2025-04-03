import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { createError } from '../utils/error-handler';
import { z } from 'zod';
import { log } from '../vite';
import { PropertyAppeal, PropertyValuation, Property } from '@shared/schema';

/**
 * Appeals recommendation engine
 * Analyzes property data to identify high-probability appeal opportunities
 */
export class AppealRecommendationService {
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
   * Generate appeal recommendations for a property
   * Analyzes various factors to determine appeal probability and potential savings
   */
  public async generateRecommendations(propertyId: number, tenantId: number): Promise<any> {
    try {
      // Get property details
      const property = await this.repository.getProperty(propertyId, tenantId);
      if (!property) {
        throw createError('Property not found', 404, 'NOT_FOUND');
      }

      // Get property valuation
      const valuations = await this.repository.getAllPropertyValuations(propertyId, tenantId);
      if (valuations.length === 0) {
        throw createError('No valuations found for property', 404, 'NOT_FOUND');
      }
      
      // Get the most recent valuation
      const valuation = valuations.sort((a, b) => 
        b.assessmentDate.getTime() - a.assessmentDate.getTime()
      )[0];
      
      // Get comparable properties
      const comparables = await this.findComparableProperties(property, tenantId);
      
      // Find successful appeals
      const successfulAppeals = await this.findSuccessfulAppeals(tenantId);
      
      // Calculate probability of successful appeal
      const probability = this.calculateAppealProbability(
        property, 
        valuation, 
        comparables,
        successfulAppeals
      );
      
      // Calculate potential savings
      const savings = this.calculatePotentialSavings(
        property,
        valuation,
        comparables,
        probability
      );
      
      // Generate evidence for recommendation
      const evidence = this.generateEvidence(
        property,
        valuation,
        comparables,
        successfulAppeals
      );
      
      // Only calculate recommended value if probability is substantial
      const recommendedValue = probability > 30 
        ? this.calculateRecommendedValue(property, valuation, comparables)
        : valuation.assessedValue;
      
      return {
        probability: Math.round(probability),
        potentialSavings: Math.round(savings),
        recommendedValue: Math.round(recommendedValue),
        evidence
      };
    } catch (error) {
      log(`Error generating appeal recommendations: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Find comparable properties for analysis
   */
  private async findComparableProperties(
    property: Property, 
    tenantId: number
  ): Promise<Property[]> {
    // Get all properties for this tenant
    const allProperties = await this.repository.getAllProperties(tenantId);
    
    // Filter out the property itself
    const otherProperties = allProperties.filter(p => p.id !== property.id);
    
    // Calculate similarity scores
    const propertiesWithScores = otherProperties.map(p => {
      return {
        property: p,
        score: this.calculateSimilarityScore(property, p)
      };
    });
    
    // Sort by similarity score (highest first)
    propertiesWithScores.sort((a, b) => b.score - a.score);
    
    // Return top 5 most similar properties
    return propertiesWithScores
      .slice(0, 5)
      .map(item => item.property);
  }
  
  /**
   * Calculate similarity score between two properties
   * Returns a value from 0-1 where 1 is identical
   */
  private calculateSimilarityScore(property1: Property, property2: Property): number {
    let score = 0;
    let factors = 0;
    
    // Same property type (high weight)
    if (property1.propertyType === property2.propertyType) {
      score += 2;
    }
    factors += 2;
    
    // Same zone code (high weight)
    if (property1.zoneCode === property2.zoneCode) {
      score += 1.5;
    }
    factors += 1.5;
    
    // Land area similarity (moderate weight)
    if (property1.landArea && property2.landArea) {
      const landAreaDiff = Math.abs(property1.landArea - property2.landArea) / Math.max(property1.landArea, property2.landArea);
      score += (1 - landAreaDiff) * 1.5;
      factors += 1.5;
    }
    
    // Building area similarity (moderate weight)
    if (property1.buildingArea && property2.buildingArea) {
      const buildingAreaDiff = Math.abs(property1.buildingArea - property2.buildingArea) / Math.max(property1.buildingArea, property2.buildingArea);
      score += (1 - buildingAreaDiff) * 1.5;
      factors += 1.5;
    }
    
    // Year built similarity (moderate weight)
    if (property1.yearBuilt && property2.yearBuilt) {
      const yearDiff = Math.abs(property1.yearBuilt - property2.yearBuilt) / 50; // Normalize by 50 years
      score += (1 - Math.min(yearDiff, 1)) * 1;
      factors += 1;
    }
    
    // Location similarity (high weight)
    if (property1.zipCode === property2.zipCode) {
      score += 2;
      
      // If same city and state
      if (property1.city === property2.city && property1.state === property2.state) {
        score += 1;
      }
    }
    factors += 3;
    
    // Features similarity (low weight)
    if (property1.features && property2.features) {
      const commonFeatures = property1.features.filter(f => property2.features.includes(f));
      const featureSimilarity = commonFeatures.length / Math.max(property1.features.length, property2.features.length);
      score += featureSimilarity * 0.5;
      factors += 0.5;
    }
    
    // Normalize score to 0-1 range
    return score / factors;
  }
  
  /**
   * Find successful appeals for analysis
   */
  private async findSuccessfulAppeals(tenantId: number): Promise<any[]> {
    // Get all properties for this tenant
    const allProperties = await this.repository.getAllProperties(tenantId);
    
    // Will hold property appeals with property data
    const appeals: any[] = [];
    
    // For each property, get appeals
    for (const property of allProperties) {
      const propertyAppeals = await this.repository.getAllPropertyAppeals(property.id, tenantId);
      
      // Filter for successful appeals
      const successfulAppeals = propertyAppeals.filter(appeal => 
        appeal.status === 'approved' && appeal.adjustedValue < appeal.requestedValue
      );
      
      // Add property data to each appeal
      for (const appeal of successfulAppeals) {
        appeals.push({
          appeal,
          property
        });
      }
    }
    
    return appeals;
  }
  
  /**
   * Calculate probability of successful appeal
   */
  private calculateAppealProbability(
    property: Property,
    valuation: PropertyValuation,
    comparables: Property[],
    successfulAppeals: any[]
  ): number {
    // Base probability
    let probability = 50;
    
    // Factor 1: Value per sq ft compared to similar properties
    if (comparables.length > 0 && property.buildingArea) {
      const propertyValuePerSqFt = valuation.assessedValue / property.buildingArea;
      
      // Get valuation data for comparables
      const comparablePrices = comparables.map(comp => {
        if (!comp.lastAssessedValue || !comp.buildingArea) return null;
        return comp.lastAssessedValue / comp.buildingArea;
      }).filter(Boolean) as number[];
      
      if (comparablePrices.length > 0) {
        // Calculate average comparable price per sq ft
        const avgComparablePrice = comparablePrices.reduce((sum, price) => sum + price, 0) / comparablePrices.length;
        
        // Calculate relative difference
        const priceDifference = (propertyValuePerSqFt - avgComparablePrice) / avgComparablePrice;
        
        // If property is assessed higher than comparables
        if (priceDifference > 0.05) { // More than 5% higher
          probability += Math.min(priceDifference * 200, 40); // Up to 40 points increase
        } else if (priceDifference < -0.05) { // More than 5% lower
          probability -= Math.min(Math.abs(priceDifference) * 100, 20); // Up to 20 points decrease
        }
      }
    }
    
    // Factor 2: Recent comparable sales
    const recentSales = comparables.filter(comp => {
      const details = comp.propertyDetails as any;
      if (!details || !details.saleDate || !details.salePrice) return false;
      
      const saleDate = new Date(details.saleDate);
      const now = new Date();
      const yearsDiff = (now.getTime() - saleDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      
      return yearsDiff <= 2; // Sales within last 2 years
    });
    
    if (recentSales.length > 0) {
      const assessedToSalesRatios = recentSales.map(comp => {
        const details = comp.propertyDetails as any;
        return comp.lastAssessedValue / details.salePrice;
      });
      
      const avgRatio = assessedToSalesRatios.reduce((sum, ratio) => sum + ratio, 0) / assessedToSalesRatios.length;
      
      // If comparable properties are assessed at lower percentage of sales price
      if (avgRatio < 0.9) { // Assessed at less than 90% of sales price
        probability += Math.min((0.9 - avgRatio) * 200, 30); // Up to 30 points increase
      } else if (avgRatio > 1.1) { // Market may be declining
        probability -= Math.min((avgRatio - 1.1) * 100, 20); // Up to 20 points decrease
      }
    }
    
    // Factor 3: Valuation method
    if (valuation.valuationMethod === 'cost_approach') {
      // Cost approach is often more likely to be successfully appealed
      probability += 10;
    } else if (valuation.valuationMethod === 'income_approach') {
      // Income approach can be challenged with market data
      probability += 5;
    }
    
    // Factor 4: Previous successful appeals
    // Higher weight for similar properties with successful appeals
    for (const appeal of successfulAppeals) {
      const similarityScore = this.calculateSimilarityScore(property, appeal.property);
      
      // Only consider somewhat similar properties
      if (similarityScore > 0.6) {
        // Calculate impact based on similarity and appeal reduction percentage
        const appealReduction = (appeal.appeal.adjustedValue - appeal.appeal.requestedValue) / appeal.appeal.adjustedValue;
        probability += similarityScore * appealReduction * 20;
      }
    }
    
    // Factor 5: Property condition
    const details = property.propertyDetails as any;
    if (details && details.condition) {
      if (details.condition === 'poor' || details.condition === 'fair') {
        probability += 15; // Poor condition properties often overassessed
      } else if (details.condition === 'excellent') {
        probability -= 10; // Excellent condition less likely to win appeal
      }
    }
    
    // Ensure probability is between 0-100
    return Math.max(0, Math.min(100, probability));
  }
  
  /**
   * Calculate potential savings from successful appeal
   */
  private calculatePotentialSavings(
    property: Property,
    valuation: PropertyValuation,
    comparables: Property[],
    appealProbability: number
  ): number {
    // If probability is very low, savings potential is also low
    if (appealProbability < 20) {
      return 0;
    }
    
    // Calculate recommended value
    const recommendedValue = this.calculateRecommendedValue(property, valuation, comparables);
    
    // Calculate value difference
    const valueDifference = valuation.assessedValue - recommendedValue;
    
    // If no potential reduction, no savings
    if (valueDifference <= 0) {
      return 0;
    }
    
    // Get property tax rate (assume 1% if not available)
    const taxRate = 0.01; // Default 1%
    
    // Calculate annual tax savings
    const annualSavings = valueDifference * taxRate;
    
    // Weight savings by appeal probability
    return annualSavings * (appealProbability / 100);
  }
  
  /**
   * Calculate recommended value for appeal
   */
  private calculateRecommendedValue(
    property: Property,
    valuation: PropertyValuation,
    comparables: Property[]
  ): number {
    // If no comparables, use a default reduction
    if (comparables.length === 0) {
      return Math.round(valuation.assessedValue * 0.9); // 10% reduction
    }
    
    // Calculate value per square foot if building area available
    if (property.buildingArea) {
      const propertyValuePerSqFt = valuation.assessedValue / property.buildingArea;
      
      // Get values per square foot for comparables
      const comparableValues = comparables
        .filter(comp => comp.lastAssessedValue && comp.buildingArea)
        .map(comp => ({
          valuePerSqFt: comp.lastAssessedValue / comp.buildingArea,
          similarity: this.calculateSimilarityScore(property, comp)
        }));
      
      if (comparableValues.length > 0) {
        // Calculate weighted average value per square foot
        const totalSimilarity = comparableValues.reduce((sum, c) => sum + c.similarity, 0);
        const weightedAvgValuePerSqFt = comparableValues.reduce(
          (sum, c) => sum + (c.valuePerSqFt * c.similarity), 0
        ) / totalSimilarity;
        
        // Calculate recommended value
        return Math.round(weightedAvgValuePerSqFt * property.buildingArea);
      }
    }
    
    // Default approach: use median of comparable assessed values with adjustments
    const adjustedValues = comparables
      .filter(comp => comp.lastAssessedValue)
      .map(comp => {
        let adjustedValue = comp.lastAssessedValue;
        
        // Adjust for building size difference if available
        if (property.buildingArea && comp.buildingArea) {
          const sizeFactor = property.buildingArea / comp.buildingArea;
          adjustedValue = adjustedValue * sizeFactor;
        }
        
        // Adjust for land area difference
        if (property.landArea && comp.landArea) {
          const landFactor = property.landArea / comp.landArea;
          // Land typically contributes 20-30% of total value
          const landAdjustment = (landFactor - 1) * 0.25 * adjustedValue;
          adjustedValue = adjustedValue + landAdjustment;
        }
        
        // Adjust for age difference if available
        if (property.yearBuilt && comp.yearBuilt) {
          const ageDiff = property.yearBuilt - comp.yearBuilt;
          // Newer properties worth more, ~0.5% per year
          const ageAdjustment = ageDiff * 0.005 * adjustedValue;
          adjustedValue = adjustedValue + ageAdjustment;
        }
        
        return adjustedValue;
      });
    
    if (adjustedValues.length > 0) {
      // Calculate median value
      adjustedValues.sort((a, b) => a - b);
      const medianIndex = Math.floor(adjustedValues.length / 2);
      return adjustedValues[medianIndex];
    }
    
    // Fallback: modest reduction from current value
    return Math.round(valuation.assessedValue * 0.9);
  }
  
  /**
   * Generate evidence items to support recommendation
   */
  private generateEvidence(
    property: Property,
    valuation: PropertyValuation,
    comparables: Property[],
    successfulAppeals: any[]
  ): Array<{type: string, description: string, impact: number}> {
    const evidence: Array<{type: string, description: string, impact: number}> = [];
    
    // Evidence 1: Comparable properties
    if (comparables.length > 0) {
      // Calculate average assessed value of comparables
      const comparableValues = comparables
        .filter(comp => comp.lastAssessedValue)
        .map(comp => comp.lastAssessedValue);
      
      if (comparableValues.length > 0) {
        const avgComparableValue = comparableValues.reduce((sum, val) => sum + val, 0) / comparableValues.length;
        const valueDiff = (valuation.assessedValue - avgComparableValue) / avgComparableValue;
        
        if (valueDiff > 0.05) { // More than 5% higher
          evidence.push({
            type: 'comparable_properties',
            description: `Subject property assessed ${Math.round(valueDiff * 100)}% higher than average of similar properties in the area`,
            impact: Math.min(valueDiff * 2, 1) * 100 // Scale impact 0-100
          });
        }
      }
      
      // If we have per square foot data
      if (property.buildingArea) {
        const comparableValuesPerSqFt = comparables
          .filter(comp => comp.lastAssessedValue && comp.buildingArea)
          .map(comp => comp.lastAssessedValue / comp.buildingArea);
        
        if (comparableValuesPerSqFt.length > 0) {
          const avgValuePerSqFt = comparableValuesPerSqFt.reduce((sum, val) => sum + val, 0) / comparableValuesPerSqFt.length;
          const propertyValuePerSqFt = valuation.assessedValue / property.buildingArea;
          const perSqFtDiff = (propertyValuePerSqFt - avgValuePerSqFt) / avgValuePerSqFt;
          
          if (perSqFtDiff > 0.05) { // More than 5% higher
            evidence.push({
              type: 'price_per_sqft',
              description: `Subject property assessed at ${Math.round(propertyValuePerSqFt)} per sq ft vs. ${Math.round(avgValuePerSqFt)} for comparable properties`,
              impact: Math.min(perSqFtDiff * 2, 1) * 90
            });
          }
        }
      }
    }
    
    // Evidence 2: Recent sales data
    const recentSales = comparables.filter(comp => {
      const details = comp.propertyDetails as any;
      return details && details.salePrice && details.saleDate;
    });
    
    if (recentSales.length > 0) {
      const salesPrices = recentSales.map(comp => {
        const details = comp.propertyDetails as any;
        return {
          price: details.salePrice,
          date: new Date(details.saleDate),
          address: comp.address
        };
      });
      
      // Sort by most recent
      salesPrices.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Get most recent sale
      const recentSale = salesPrices[0];
      const saleToAssessmentRatio = recentSale.price / valuation.assessedValue;
      
      if (saleToAssessmentRatio < 0.9) { // Sale price is less than 90% of assessment
        evidence.push({
          type: 'recent_sales',
          description: `Recent sale at ${recentSale.address} sold for ${Math.round(saleToAssessmentRatio * 100)}% of its assessed value`,
          impact: Math.min((1 - saleToAssessmentRatio) * 2, 1) * 85
        });
      }
    }
    
    // Evidence 3: Successful appeals
    const similarAppeals = successfulAppeals.filter(item => 
      this.calculateSimilarityScore(property, item.property) > 0.6
    );
    
    if (similarAppeals.length > 0) {
      // Sort by highest reduction
      similarAppeals.sort((a, b) => {
        const reductionA = (a.appeal.adjustedValue - a.appeal.requestedValue) / a.appeal.adjustedValue;
        const reductionB = (b.appeal.adjustedValue - b.appeal.requestedValue) / b.appeal.adjustedValue;
        return reductionB - reductionA;
      });
      
      const topAppeal = similarAppeals[0];
      const reduction = (topAppeal.appeal.adjustedValue - topAppeal.appeal.requestedValue) / topAppeal.appeal.adjustedValue;
      
      evidence.push({
        type: 'successful_appeals',
        description: `Similar property successfully appealed with ${Math.round(reduction * 100)}% reduction in assessed value`,
        impact: Math.min(reduction * 3, 1) * 75
      });
    }
    
    // Evidence 4: Valuation method concerns
    if (valuation.valuationMethod === 'cost_approach') {
      evidence.push({
        type: 'valuation_method',
        description: 'Cost approach valuation often overestimates depreciation and may not reflect actual market conditions',
        impact: 60
      });
    }
    
    // Evidence 5: Property condition
    const details = property.propertyDetails as any;
    if (details && details.condition === 'poor') {
      evidence.push({
        type: 'property_condition',
        description: 'Property in poor condition which may not be fully accounted for in current valuation',
        impact: 70
      });
    }
    
    // Sort evidence by impact (descending)
    evidence.sort((a, b) => b.impact - a.impact);
    
    return evidence;
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    // Generate appeal recommendations endpoint
    this.router.get('/recommendations/:propertyId', async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.propertyId);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Set content type to ensure JSON response
        res.setHeader('Content-Type', 'application/json');
        
        // Generate recommendations
        const recommendations = await this.generateRecommendations(propertyId, tenantId);
        
        res.status(200).json(recommendations);
      } catch (error: any) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });
    
    // Alias endpoint for backward compatibility
    this.router.get('/recommend/:propertyId', async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.propertyId);
        const tenantId = parseInt(req.query.tenantId as string) || 1;
        
        // Set content type to ensure JSON response
        res.setHeader('Content-Type', 'application/json');
        
        log(`Using alias endpoint /recommend/${propertyId} - recommend using /recommendations/${propertyId} instead`, 'appeal-recommendation');
        
        // Generate recommendations using the same method
        const recommendations = await this.generateRecommendations(propertyId, tenantId);
        
        res.status(200).json(recommendations);
      } catch (error: any) {
        res.status(error.status || 500).json({ 
          message: error.message || 'Internal server error' 
        });
      }
    });
  }
}

export function createAppealRecommendationService(repository: IStorage): AppealRecommendationService {
  return new AppealRecommendationService(repository);
}