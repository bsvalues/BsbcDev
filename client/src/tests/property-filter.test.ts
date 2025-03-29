import { Property } from '@shared/schema';
import { filterProperties, sortProperties } from '@/lib/property-filter';

// Mock data for testing
const mockProperties: Property[] = [
  {
    id: 1,
    tenantId: 1,
    parcelId: 'PAR-001',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    propertyType: 'residential',
    zoneCode: 'R1',
    landArea: 5000,
    buildingArea: 2500,
    yearBuilt: 1985,
    bedrooms: 3,
    bathrooms: 2,
    floors: 2,
    parking: true,
    amenities: ['garage', 'backyard'],
    status: 'active',
    propertyDetails: { 
      marketValue: 320000, 
      assessedValue: 300000,
      taxableValue: 290000 
    }
  },
  {
    id: 2,
    tenantId: 1,
    parcelId: 'PAR-002',
    address: '456 Oak Ave',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62702',
    propertyType: 'commercial',
    zoneCode: 'C1',
    landArea: 10000,
    buildingArea: 8000,
    yearBuilt: 2002,
    bedrooms: null,
    bathrooms: 4,
    floors: 3,
    parking: true,
    amenities: ['parking lot', 'elevator'],
    status: 'active',
    propertyDetails: { 
      marketValue: 750000,
      assessedValue: 700000,
      taxableValue: 680000
    }
  },
  {
    id: 3,
    tenantId: 1,
    parcelId: 'PAR-003',
    address: '789 Pine Ln',
    city: 'Shelbyville',
    state: 'IL',
    zipCode: '62565',
    propertyType: 'residential',
    zoneCode: 'R2',
    landArea: 4500,
    buildingArea: 1800,
    yearBuilt: 1995,
    bedrooms: 2,
    bathrooms: 1,
    floors: 1,
    parking: false,
    amenities: ['patio'],
    status: 'pending',
    propertyDetails: { 
      marketValue: 230000,
      assessedValue: 215000,
      taxableValue: 210000
    }
  }
];

describe('Property Filter Utilities', () => {
  // Text contains filter
  test('should filter properties by address containing specific text', () => {
    const result = filterProperties(mockProperties, { address: { contains: 'Main' } });
    expect(result.length).toBe(1);
    expect(result[0].address).toBe('123 Main St');
  });
  
  // Exact match filter
  test('should filter properties by exact property type match', () => {
    const result = filterProperties(mockProperties, { propertyType: { equals: 'residential' } });
    expect(result.length).toBe(2);
    expect(result.every(p => p.propertyType === 'residential')).toBe(true);
  });
  
  // Numeric range filter
  test('should filter properties by land area range', () => {
    const result = filterProperties(mockProperties, { landArea: { min: 5000, max: 10000 } });
    expect(result.length).toBe(2);
    expect(result.every(p => p.landArea >= 5000 && p.landArea <= 10000)).toBe(true);
  });
  
  // Multiple filters
  test('should combine multiple filters with AND logic', () => {
    const result = filterProperties(mockProperties, {
      propertyType: { equals: 'residential' },
      city: { equals: 'Springfield' }
    });
    expect(result.length).toBe(1);
    expect(result[0].address).toBe('123 Main St');
  });
  
  // Nested property filter
  test('should filter by nested property values', () => {
    const result = filterProperties(mockProperties, {
      'propertyDetails.marketValue': { min: 300000 }
    });
    expect(result.length).toBe(2);
    expect(result.every(p => (p.propertyDetails as any).marketValue >= 300000)).toBe(true);
  });
  
  // Array contains filter
  test('should filter properties by amenities containing a value', () => {
    const result = filterProperties(mockProperties, {
      amenities: { contains: 'garage' }
    });
    expect(result.length).toBe(1);
    expect(result[0].address).toBe('123 Main St');
  });
  
  // Empty filter returns all properties
  test('should return all properties when filter is empty', () => {
    const result = filterProperties(mockProperties, {});
    expect(result.length).toBe(mockProperties.length);
  });
  
  // No matches
  test('should return empty array when no properties match filter', () => {
    const result = filterProperties(mockProperties, {
      address: { contains: 'XYZ123NonExistent' }
    });
    expect(result.length).toBe(0);
  });
  
  // Sorting tests
  test('should sort properties by address in ascending order', () => {
    const result = sortProperties(mockProperties, 'address', 'asc');
    expect(result[0].address).toBe('123 Main St');
    expect(result[1].address).toBe('456 Oak Ave');
    expect(result[2].address).toBe('789 Pine Ln');
  });
  
  test('should sort properties by address in descending order', () => {
    const result = sortProperties(mockProperties, 'address', 'desc');
    expect(result[0].address).toBe('789 Pine Ln');
    expect(result[1].address).toBe('456 Oak Ave');
    expect(result[2].address).toBe('123 Main St');
  });
  
  test('should sort properties by numeric value', () => {
    const result = sortProperties(mockProperties, 'landArea', 'desc');
    expect(result[0].landArea).toBe(10000);
    expect(result[1].landArea).toBe(5000);
    expect(result[2].landArea).toBe(4500);
  });
  
  test('should sort by nested property field', () => {
    const result = sortProperties(mockProperties, 'propertyDetails.marketValue', 'asc');
    expect((result[0].propertyDetails as any).marketValue).toBe(230000);
    expect((result[1].propertyDetails as any).marketValue).toBe(320000);
    expect((result[2].propertyDetails as any).marketValue).toBe(750000);
  });
});