import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { MemStorage } from '../server/storage';
import { InsertProperty, InsertPropertyValuation } from '@shared/schema';

describe('Predictive Valuation Engine', () => {
  let storage: MemStorage;
  let property: any;
  let propertyId: number;
  let tenantId: number = 1;
  let userId: number = 1;
  
  beforeEach(async () => {
    storage = new MemStorage();
    
    // Create a test property
    const propertyData: InsertProperty = {
      tenantId,
      parcelId: "TEST12345",
      address: "123 Test Street",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      propertyType: "residential",
      zoneCode: "R1",
      landArea: 10000,
      buildingArea: 2500,
      yearBuilt: 1990,
      bedrooms: 4,
      bathrooms: 2.5,
      features: ["garage", "fireplace"],
      lastAssessedValue: 350000,
      lastAssessedDate: new Date(2022, 0, 1), // January 1, 2022
      createdBy: userId,
      status: "active",
      propertyDetails: {}
    };
    
    property = await storage.createProperty(propertyData);
    propertyId = property.id;
    
    // Create historical valuations for testing
    const valuations = [
      {
        propertyId,
        tenantId,
        assessedValue: 300000,
        marketValue: 320000,
        taxableValue: 300000,
        assessmentDate: new Date(2020, 0, 1),
        effectiveDate: new Date(2020, 0, 1),
        expirationDate: new Date(2020, 11, 31),
        valuationMethod: "sales_comparison",
        assessorId: userId,
        status: "published",
        valuationFactors: {
          landValue: 120000,
          improvementValue: 180000,
          comparableSales: [
            { address: "125 Test St", salePrice: 315000, saleDate: "2019-10-15" },
            { address: "130 Test St", salePrice: 325000, saleDate: "2019-11-20" }
          ]
        }
      },
      {
        propertyId,
        tenantId,
        assessedValue: 325000,
        marketValue: 345000,
        taxableValue: 325000,
        assessmentDate: new Date(2021, 0, 1),
        effectiveDate: new Date(2021, 0, 1),
        expirationDate: new Date(2021, 11, 31),
        valuationMethod: "sales_comparison",
        assessorId: userId,
        status: "published",
        valuationFactors: {
          landValue: 130000,
          improvementValue: 195000,
          comparableSales: [
            { address: "125 Test St", salePrice: 335000, saleDate: "2020-10-01" },
            { address: "130 Test St", salePrice: 350000, saleDate: "2020-11-15" }
          ]
        }
      },
      {
        propertyId,
        tenantId,
        assessedValue: 350000,
        marketValue: 370000,
        taxableValue: 350000,
        assessmentDate: new Date(2022, 0, 1),
        effectiveDate: new Date(2022, 0, 1),
        expirationDate: new Date(2022, 11, 31),
        valuationMethod: "sales_comparison",
        assessorId: userId,
        status: "published",
        valuationFactors: {
          landValue: 140000,
          improvementValue: 210000,
          comparableSales: [
            { address: "125 Test St", salePrice: 365000, saleDate: "2021-10-05" },
            { address: "130 Test St", salePrice: 380000, saleDate: "2021-11-10" }
          ]
        }
      }
    ];
    
    for (const valuation of valuations) {
      await storage.createPropertyValuation(valuation as InsertPropertyValuation);
    }
  });
  
  test('should generate predictions for properties with sufficient historical data', async () => {
    const predictionDate = new Date(2023, 0, 1); // January 1, 2023
    const prediction = await storage.generatePredictiveValuation(propertyId, predictionDate);
    
    // Basic validation
    expect(prediction).toBeDefined();
    expect(prediction.propertyId).toBe(propertyId);
    expect(prediction.tenantId).toBe(tenantId);
    expect(prediction.valuationMethod).toBe('predictive_model');
    expect(prediction.assessmentDate.getFullYear()).toBe(2023);
    
    // Value should follow trend (approximately 25k increase per year)
    expect(prediction.assessedValue).toBeGreaterThan(350000);
    expect(prediction.assessedValue).toBeLessThan(400000);
    
    // Should include confidence score and prediction details
    expect(prediction.confidenceScore).toBeDefined();
    expect(prediction.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(prediction.confidenceScore).toBeLessThanOrEqual(100);
    expect(prediction.predictionModels).toBeDefined();
  });
  
  test('should provide confidence scores with predictions', async () => {
    const predictionDate = new Date(2023, 0, 1);
    const prediction = await storage.generatePredictiveValuation(propertyId, predictionDate);
    
    expect(prediction.confidenceScore).toBeDefined();
    expect(prediction.confidenceScore).toBeGreaterThanOrEqual(50); // Good confidence with 3 years data
    
    // The further out we predict, the lower the confidence should be
    const farFuturePrediction = await storage.generatePredictiveValuation(
      propertyId, 
      new Date(2025, 0, 1)
    );
    
    expect(farFuturePrediction.confidenceScore).toBeLessThan(prediction.confidenceScore);
  });
  
  test('should handle properties with limited historical data', async () => {
    // Create a new property with only one valuation
    const newProperty = await storage.createProperty({
      tenantId,
      parcelId: "NEW12345",
      address: "456 New Street",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      propertyType: "residential",
      zoneCode: "R1",
      landArea: 8000,
      createdBy: userId,
      status: "active"
    });
    
    // Add just one valuation
    await storage.createPropertyValuation({
      propertyId: newProperty.id,
      tenantId,
      assessedValue: 200000,
      marketValue: 210000,
      taxableValue: 200000,
      assessmentDate: new Date(2022, 0, 1),
      effectiveDate: new Date(2022, 0, 1),
      valuationMethod: "sales_comparison",
      assessorId: userId,
      status: "published"
    });
    
    const prediction = await storage.generatePredictiveValuation(
      newProperty.id, 
      new Date(2023, 0, 1)
    );
    
    // Should still generate a prediction but with lower confidence
    expect(prediction).toBeDefined();
    expect(prediction.confidenceScore).toBeLessThan(50);
    expect(prediction.predictionModels).toHaveProperty('method', 'limited_data');
  });
  
  test('should detect and account for seasonal variations', async () => {
    // Add seasonal valuations for testing
    const seasonalValuations = [
      // Spring values higher
      {
        propertyId,
        tenantId,
        assessedValue: 360000,
        marketValue: 380000,
        taxableValue: 360000,
        assessmentDate: new Date(2022, 3, 1), // April 2022
        effectiveDate: new Date(2022, 3, 1),
        valuationMethod: "sales_comparison",
        assessorId: userId,
        status: "published"
      },
      // Fall values lower
      {
        propertyId,
        tenantId,
        assessedValue: 345000,
        marketValue: 365000,
        taxableValue: 345000,
        assessmentDate: new Date(2022, 9, 1), // October 2022
        effectiveDate: new Date(2022, 9, 1),
        valuationMethod: "sales_comparison",
        assessorId: userId,
        status: "published"
      }
    ];
    
    for (const valuation of seasonalValuations) {
      await storage.createPropertyValuation(valuation as InsertPropertyValuation);
    }
    
    // Spring prediction should be higher than fall
    const springPrediction = await storage.generatePredictiveValuation(
      propertyId, 
      new Date(2023, 3, 1) // April 2023
    );
    
    const fallPrediction = await storage.generatePredictiveValuation(
      propertyId, 
      new Date(2023, 9, 1) // October 2023
    );
    
    expect(springPrediction.assessedValue).toBeGreaterThan(fallPrediction.assessedValue);
    expect(springPrediction.seasonalAdjustment).toBeDefined();
    expect(fallPrediction.seasonalAdjustment).toBeDefined();
    expect(springPrediction.seasonalAdjustment).toBeGreaterThan(1); // Positive adjustment
    expect(fallPrediction.seasonalAdjustment).toBeLessThan(1); // Negative adjustment
  });
});