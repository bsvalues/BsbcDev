import { filterProperties, sortProperties, getValueByPath, formatFilterFieldName } from '../lib/property-filter';
import { PropertyFilters, SortDirection } from '../lib/property-filter-types';

// Define a minimal Property interface for testing
interface Property {
  id: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  lotSize: number;
  propertyTaxes: number;
  assessedValue: number;
  marketValue: number;
  tenantId: number;
}

// Mock property data for testing
const mockProperties: Partial<Property>[] = [
  {
    id: 1,
    address: '123 Main St',
    city: 'Cityville',
    state: 'CA',
    zipCode: '12345',
    propertyType: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    yearBuilt: 1980,
    lotSize: 5000,
    propertyTaxes: 5000,
    assessedValue: 500000,
    marketValue: 550000,
    tenantId: 1
  },
  {
    id: 2,
    address: '456 Elm Ave',
    city: 'Townburg',
    state: 'NY',
    zipCode: '54321',
    propertyType: 'Condo',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 1200,
    yearBuilt: 2000,
    lotSize: 0,
    propertyTaxes: 3000,
    assessedValue: 300000,
    marketValue: 320000,
    tenantId: 1
  },
  {
    id: 3,
    address: '789 Oak Blvd',
    city: 'Villageton',
    state: 'TX',
    zipCode: '67890',
    propertyType: 'Multi Family',
    bedrooms: 5,
    bathrooms: 3,
    squareFeet: 2500,
    yearBuilt: 1995,
    lotSize: 8000,
    propertyTaxes: 7000,
    assessedValue: 650000,
    marketValue: 700000,
    tenantId: 1
  }
];

describe('Property Filter Utilities', () => {
  // Test getValueByPath function
  describe('getValueByPath', () => {
    test('should retrieve simple properties', () => {
      const property = mockProperties[0];
      expect(getValueByPath(property, 'address')).toBe('123 Main St');
      expect(getValueByPath(property, 'bedrooms')).toBe(3);
    });
    
    test('should return undefined for non-existent properties', () => {
      const property = mockProperties[0];
      expect(getValueByPath(property, 'nonExistentProp')).toBeUndefined();
    });
    
    // Test nested property access (when we add such props in the future)
    test('should handle nested properties', () => {
      const nestedObject = {
        user: {
          profile: {
            name: 'John Doe'
          }
        }
      };
      expect(getValueByPath(nestedObject, 'user.profile.name')).toBe('John Doe');
    });
  });
  
  // Test filterProperties function
  describe('filterProperties', () => {
    test('should return all properties when filters are empty', () => {
      const filters: PropertyFilters = {};
      const result = filterProperties(mockProperties as Property[], filters);
      expect(result.length).toBe(mockProperties.length);
    });
    
    test('should filter by exact match (equals)', () => {
      const filters: PropertyFilters = {
        state: { equals: 'CA' }
      };
      const result = filterProperties(mockProperties as Property[], filters);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
    
    test('should filter by text contains', () => {
      const filters: PropertyFilters = {
        city: { contains: 'ville' }
      };
      const result = filterProperties(mockProperties as Property[], filters);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
    
    test('should filter by numeric range', () => {
      const filters: PropertyFilters = {
        marketValue: { min: 500000, max: 700000 }
      };
      const result = filterProperties(mockProperties as Property[], filters);
      expect(result.length).toBe(2);
      expect(result.map(p => p.id)).toEqual([1, 3]);
    });
    
    test('should handle multiple filters (AND logic)', () => {
      const filters: PropertyFilters = {
        propertyType: { contains: 'Family' },
        bedrooms: { min: 3 }
      };
      const result = filterProperties(mockProperties as Property[], filters);
      expect(result.length).toBe(2);
      expect(result.map(p => p.id)).toEqual([1, 3]);
    });
  });
  
  // Test sortProperties function
  describe('sortProperties', () => {
    test('should sort properties by string field in ascending order', () => {
      const sortField = 'city';
      const direction: SortDirection = 'asc';
      const result = sortProperties(mockProperties as Property[], sortField, direction);
      expect(result.map(p => p.city)).toEqual(['Cityville', 'Townburg', 'Villageton']);
    });
    
    test('should sort properties by numeric field in descending order', () => {
      const sortField = 'marketValue';
      const direction: SortDirection = 'desc';
      const result = sortProperties(mockProperties as Property[], sortField, direction);
      expect(result.map(p => p.marketValue)).toEqual([700000, 550000, 320000]);
    });
  });
  
  // Test formatFilterFieldName function
  describe('formatFilterFieldName', () => {
    test('should format camelCase field names to Title Case', () => {
      expect(formatFilterFieldName('propertyType')).toBe('Property Type');
      expect(formatFilterFieldName('yearBuilt')).toBe('Year Built');
    });
    
    test('should handle nested field paths', () => {
      expect(formatFilterFieldName('property.marketValue')).toBe('Market Value');
    });
  });
});