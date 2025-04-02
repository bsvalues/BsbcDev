import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { MemStorage } from '../server/storage';
import { InsertProperty, InsertPropertyValuation, InsertPropertyAppeal } from '@shared/schema';

describe('Tax Appeal Recommendation Engine', () => {
  let storage: MemStorage;
  let property: any;
  let propertyId: number;
  let overassessedPropertyId: number;
  let tenantId: number = 1;
  let userId: number = 1;
  
  beforeEach(async () => {
    storage = new MemStorage();
    
    // Create a typical property with fair assessment
    const propertyData: InsertProperty = {
      tenantId,
      parcelId: "FAIR12345",
      address: "123 Fair Street",
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
      lastAssessedDate: new Date(2022, 0, 1),
      createdBy: userId,
      status: "active",
      propertyDetails: {}
    };
    
    property = await storage.createProperty(propertyData);
    propertyId = property.id;
    
    // Add fair valuation
    await storage.createPropertyValuation({
      propertyId,
      tenantId,
      assessedValue: 350000,
      marketValue: 365000,
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
          { address: "125 Fair St", salePrice: 355000, saleDate: "2021-10-05" },
          { address: "130 Fair St", salePrice: 360000, saleDate: "2021-11-10" }
        ]
      }
    });
    
    // Create an over-assessed property
    const overassessedPropertyData: InsertProperty = {
      tenantId,
      parcelId: "OVER12345",
      address: "456 Overpriced Street",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      propertyType: "residential",
      zoneCode: "R1",
      landArea: 9500,
      buildingArea: 2200,
      yearBuilt: 1992,
      bedrooms: 3,
      bathrooms: 2,
      features: ["garage"],
      lastAssessedValue: 425000, // Overassessed
      lastAssessedDate: new Date(2022, 0, 1),
      createdBy: userId,
      status: "active",
      propertyDetails: {
        condition: "average",
        recentRenovations: false
      }
    };
    
    const overassessedProperty = await storage.createProperty(overassessedPropertyData);
    overassessedPropertyId = overassessedProperty.id;
    
    // Add overassessed valuation
    await storage.createPropertyValuation({
      propertyId: overassessedPropertyId,
      tenantId,
      assessedValue: 425000, // Overassessed
      marketValue: 430000,
      taxableValue: 425000,
      assessmentDate: new Date(2022, 0, 1),
      effectiveDate: new Date(2022, 0, 1),
      expirationDate: new Date(2022, 11, 31),
      valuationMethod: "cost_approach",
      assessorId: userId,
      status: "published",
      valuationFactors: {
        landValue: 150000,
        improvementValue: 275000, // Overvalued improvements
        comparableSales: [
          { address: "460 Overpriced St", salePrice: 360000, saleDate: "2021-09-15" },
          { address: "470 Overpriced St", salePrice: 355000, saleDate: "2021-10-20" }
        ]
      }
    });
    
    // Add some comparable sales in the same area for context
    for (let i = 0; i < 10; i++) {
      await storage.createProperty({
        tenantId,
        parcelId: `COMP${i}`,
        address: `${i}00 Comparable Street`,
        city: "Testville",
        state: "TS",
        zipCode: "12345",
        propertyType: "residential",
        zoneCode: "R1",
        landArea: 9000 + Math.random() * 2000,
        buildingArea: 2000 + Math.random() * 500,
        yearBuilt: 1990 + Math.floor(Math.random() * 10),
        bedrooms: 3 + Math.floor(Math.random() * 2),
        bathrooms: 2 + Math.floor(Math.random() * 2) / 2,
        features: ["garage"],
        lastAssessedValue: 350000 + Math.random() * 20000,
        lastAssessedDate: new Date(2022, 0, 1),
        createdBy: userId,
        status: "active",
        propertyDetails: {
          saleDate: new Date(2021, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          salePrice: 345000 + Math.random() * 30000
        }
      });
    }
    
    // Add some successful appeals for the model to learn from
    const successfulAppeals = [
      {
        propertyId: await (await storage.createProperty({
          tenantId,
          parcelId: "APPEAL1",
          address: "700 Appeal Street",
          city: "Testville",
          state: "TS",
          zipCode: "12345",
          propertyType: "residential",
          zoneCode: "R1",
          landArea: 9200,
          buildingArea: 2100,
          yearBuilt: 1995,
          lastAssessedValue: 410000,
          createdBy: userId,
          status: "active"
        })).id,
        tenantId,
        valuationId: 0, // Will be set below
        submittedBy: userId,
        reviewedBy: userId + 1,
        reason: "Comparable properties in area sold for less",
        requestedValue: 360000,
        evidenceUrls: ["http://example.com/evidence1.pdf"],
        status: "approved",
        submittedAt: new Date(2022, 2, 15),
        reviewedAt: new Date(2022, 3, 20),
        decision: "Approved based on comparable sales",
        decisionReason: "Recent sales in area support lower valuation",
        adjustedValue: 365000
      }
    ];
    
    for (const appeal of successfulAppeals) {
      // Create a valuation for this appeal
      const valuation = await storage.createPropertyValuation({
        propertyId: appeal.propertyId,
        tenantId,
        assessedValue: 410000,
        marketValue: 420000,
        taxableValue: 410000,
        assessmentDate: new Date(2022, 0, 1),
        effectiveDate: new Date(2022, 0, 1),
        valuationMethod: "cost_approach",
        assessorId: userId,
        status: "published"
      });
      
      // Update the appeal with the valuation ID
      appeal.valuationId = valuation.id;
      await storage.createPropertyAppeal(appeal as InsertPropertyAppeal);
    }
  });
  
  test('should identify properties with high appeal probability', async () => {
    // For fairly assessed property, should find low probability
    const fairPropertyRecommendation = await storage.generateAppealRecommendations(propertyId, tenantId);
    
    expect(fairPropertyRecommendation).toBeDefined();
    expect(fairPropertyRecommendation.probability).toBeLessThan(30);
    
    // For overassessed property, should find high probability
    const overassessedPropertyRecommendation = await storage.generateAppealRecommendations(overassessedPropertyId, tenantId);
    
    expect(overassessedPropertyRecommendation).toBeDefined();
    expect(overassessedPropertyRecommendation.probability).toBeGreaterThan(70);
    expect(overassessedPropertyRecommendation.potentialSavings).toBeGreaterThan(10000);
  });
  
  test('should generate supporting evidence for recommendations', async () => {
    const recommendation = await storage.generateAppealRecommendations(overassessedPropertyId, tenantId);
    
    expect(recommendation.evidence).toBeDefined();
    expect(recommendation.evidence.length).toBeGreaterThan(0);
    
    // Should include evidence types
    const evidenceTypes = recommendation.evidence.map(e => e.type);
    expect(evidenceTypes).toContain('comparable_sales');
    
    // Each evidence item should have impact
    for (const evidence of recommendation.evidence) {
      expect(evidence.description).toBeTruthy();
      expect(evidence.impact).toBeDefined();
      expect(typeof evidence.impact).toBe('number');
    }
  });
  
  test('should rank recommendations by probability of success', async () => {
    // Create a borderline case property
    const borderlineProperty = await storage.createProperty({
      tenantId,
      parcelId: "BORDER12345",
      address: "789 Borderline Street",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      propertyType: "residential",
      zoneCode: "R1",
      landArea: 9800,
      buildingArea: 2300,
      yearBuilt: 1991,
      lastAssessedValue: 380000, // Slightly overassessed
      createdBy: userId,
      status: "active"
    });
    
    await storage.createPropertyValuation({
      propertyId: borderlineProperty.id,
      tenantId,
      assessedValue: 380000,
      marketValue: 385000,
      taxableValue: 380000,
      assessmentDate: new Date(2022, 0, 1),
      effectiveDate: new Date(2022, 0, 1),
      valuationMethod: "sales_comparison",
      assessorId: userId,
      status: "published"
    });
    
    // Get all recommendations
    const overassessedRec = await storage.generateAppealRecommendations(overassessedPropertyId, tenantId);
    const borderlineRec = await storage.generateAppealRecommendations(borderlineProperty.id, tenantId);
    const fairRec = await storage.generateAppealRecommendations(propertyId, tenantId);
    
    // Rankings should match probability order
    expect(overassessedRec.probability).toBeGreaterThan(borderlineRec.probability);
    expect(borderlineRec.probability).toBeGreaterThan(fairRec.probability);
  });
  
  test('should improve recommendations based on outcome feedback', async () => {
    // Simulate the system learning from appeal outcomes
    // First, get initial recommendation
    const initialRecommendation = await storage.generateAppealRecommendations(overassessedPropertyId, tenantId);
    
    // Create a successful appeal based on the recommendation
    const valuation = await storage.getAllPropertyValuations(overassessedPropertyId, tenantId);
    const valuationId = valuation[0].id;
    
    await storage.createPropertyAppeal({
      propertyId: overassessedPropertyId,
      tenantId,
      valuationId,
      submittedBy: userId,
      reason: "Property is overassessed compared to similar properties",
      requestedValue: initialRecommendation.recommendedValue,
      evidenceUrls: ["http://example.com/evidence-new.pdf"],
      status: "approved",
      submittedAt: new Date(),
      reviewedBy: userId + 1,
      reviewedAt: new Date(),
      decision: "Approved",
      decisionReason: "Comparable sales support lower valuation",
      adjustedValue: initialRecommendation.recommendedValue
    });
    
    // Create a new similar property
    const similarProperty = await storage.createProperty({
      tenantId,
      parcelId: "SIMILAR12345",
      address: "999 Similar Street",
      city: "Testville",
      state: "TS",
      zipCode: "12345",
      propertyType: "residential",
      zoneCode: "R1",
      landArea: 9600, // Similar to overassessed
      buildingArea: 2250, // Similar to overassessed
      yearBuilt: 1993, // Similar to overassessed
      bedrooms: 3,
      bathrooms: 2,
      features: ["garage"],
      lastAssessedValue: 420000, // Overassessed like the other property
      createdBy: userId,
      status: "active",
      propertyDetails: {
        condition: "average",
        recentRenovations: false
      }
    });
    
    await storage.createPropertyValuation({
      propertyId: similarProperty.id,
      tenantId,
      assessedValue: 420000,
      marketValue: 425000,
      taxableValue: 420000,
      assessmentDate: new Date(2022, 0, 1),
      effectiveDate: new Date(2022, 0, 1),
      valuationMethod: "cost_approach",
      assessorId: userId,
      status: "published"
    });
    
    // Get recommendation for similar property after system has "learned"
    const improvedRecommendation = await storage.generateAppealRecommendations(similarProperty.id, tenantId);
    
    // Should have higher confidence due to previous successful appeal
    expect(improvedRecommendation.probability).toBeGreaterThanOrEqual(initialRecommendation.probability);
    
    // Evidence should reference similar successful appeal
    const hasSuccessEvidenceItem = improvedRecommendation.evidence.some(
      e => e.description.toLowerCase().includes("successful") && e.description.toLowerCase().includes("appeal")
    );
    expect(hasSuccessEvidenceItem).toBe(true);
  });
});