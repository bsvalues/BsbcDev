import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertySearchPanel } from '@/components/properties/property-search-panel';
import { Property } from '@shared/schema';
import { ActiveFilterChips } from '@/components/properties/active-filter-chips';

// Mock properties data
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
  }
];

// Mock callback functions
const mockOnFilterChange = jest.fn();
const mockOnRemoveFilter = jest.fn();
const mockOnClearFilters = jest.fn();
const mockOnSaveSearch = jest.fn();

describe('Property Search Panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render all filter controls in search panel', () => {
    render(<PropertySearchPanel 
      properties={mockProperties} 
      onFilterChange={mockOnFilterChange} 
      onSaveSearch={mockOnSaveSearch}
    />);
    
    // Check for presence of filter controls
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/property type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  test('should update filters when user inputs values', async () => {
    render(<PropertySearchPanel 
      properties={mockProperties} 
      onFilterChange={mockOnFilterChange}
      onSaveSearch={mockOnSaveSearch}
    />);
    
    // Enter filter values
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: 'Main' } });
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Springfield' } });
    
    // Select property type
    fireEvent.click(screen.getByLabelText(/property type/i));
    fireEvent.click(screen.getByText(/residential/i));
    
    // Apply filters
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    
    // Check if callback was called with correct filters
    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      address: { contains: 'Main' },
      city: { equals: 'Springfield' },
      propertyType: { equals: 'residential' }
    }));
  });

  test('should clear all filters when clear button is clicked', async () => {
    render(<PropertySearchPanel 
      properties={mockProperties} 
      onFilterChange={mockOnFilterChange}
      onSaveSearch={mockOnSaveSearch}
      initialFilters={{
        address: { contains: 'Main' },
        city: { equals: 'Springfield' }
      }} 
    />);
    
    // The fields should be populated with initial values
    expect(screen.getByLabelText(/address/i)).toHaveValue('Main');
    expect(screen.getByLabelText(/city/i)).toHaveValue('Springfield');
    
    // Click clear button
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    
    // Fields should be cleared
    expect(screen.getByLabelText(/address/i)).toHaveValue('');
    expect(screen.getByLabelText(/city/i)).toHaveValue('');
    
    // Apply button should trigger with empty filters
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    expect(mockOnFilterChange).toHaveBeenCalledWith({});
  });

  test('should save search when save button is clicked', async () => {
    render(<PropertySearchPanel 
      properties={mockProperties} 
      onFilterChange={mockOnFilterChange}
      onSaveSearch={mockOnSaveSearch}
      initialFilters={{
        address: { contains: 'Main' },
        propertyType: { equals: 'residential' }
      }}
    />);
    
    // Click save search button
    fireEvent.click(screen.getByRole('button', { name: /save search/i }));
    
    // Enter search name
    fireEvent.change(screen.getByLabelText(/search name/i), { 
      target: { value: 'My Saved Search' } 
    });
    
    // Confirm save
    fireEvent.click(screen.getByRole('button', { name: /save$/i }));
    
    // Check if callback was called with correct data
    expect(mockOnSaveSearch).toHaveBeenCalledWith(
      'My Saved Search', 
      expect.objectContaining({
        address: { contains: 'Main' },
        propertyType: { equals: 'residential' }
      })
    );
  });
});

describe('Active Filter Chips', () => {
  test('should display chips for all active filters', () => {
    const activeFilters = {
      address: { contains: 'Main' },
      propertyType: { equals: 'residential' },
      'propertyDetails.marketValue': { min: 300000, max: 500000 }
    };
    
    render(<ActiveFilterChips 
      activeFilters={activeFilters} 
      onRemoveFilter={mockOnRemoveFilter}
      onClearFilters={mockOnClearFilters}
    />);
    
    // Check for presence of filter chips
    expect(screen.getByText(/address: contains main/i)).toBeInTheDocument();
    expect(screen.getByText(/property type: residential/i)).toBeInTheDocument();
    expect(screen.getByText(/market value: \$300,000 - \$500,000/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });
  
  test('should call remove filter when chip close button is clicked', () => {
    const activeFilters = {
      address: { contains: 'Main' },
      propertyType: { equals: 'residential' }
    };
    
    render(<ActiveFilterChips 
      activeFilters={activeFilters} 
      onRemoveFilter={mockOnRemoveFilter}
      onClearFilters={mockOnClearFilters}
    />);
    
    // Click remove button on address filter
    fireEvent.click(screen.getAllByLabelText(/remove filter/i)[0]);
    
    // Check if callback was called with correct filter key
    expect(mockOnRemoveFilter).toHaveBeenCalledWith('address');
  });
  
  test('should call clear all filters when clear all button is clicked', () => {
    const activeFilters = {
      address: { contains: 'Main' },
      propertyType: { equals: 'residential' }
    };
    
    render(<ActiveFilterChips 
      activeFilters={activeFilters} 
      onRemoveFilter={mockOnRemoveFilter}
      onClearFilters={mockOnClearFilters}
    />);
    
    // Click clear all button
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    
    // Check if callback was called
    expect(mockOnClearFilters).toHaveBeenCalled();
  });
});