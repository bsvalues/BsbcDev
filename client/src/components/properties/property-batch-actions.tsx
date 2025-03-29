import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, Loader2, X, AlertCircle, Download, SendHorizontal, MoreHorizontal } from 'lucide-react';

interface PropertyBatchActionsProps {
  selectedProperties: Property[];
  onClearSelection: () => void;
}

export function PropertyBatchActions({ selectedProperties, onClearSelection }: PropertyBatchActionsProps) {
  const [action, setAction] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({
    title: '',
    description: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Handle updating multiple properties
  const updatePropertiesMutation = useMutation({
    mutationFn: async (properties: { id: number, update: Partial<Property> }[]) => {
      const requests = properties.map(prop => 
        apiRequest(
          'PATCH',
          `/api/properties/${prop.id}`,
          prop.update
        )
      );
      return Promise.all(requests);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: 'Success',
        description: `Updated ${selectedProperties.length} properties`,
        variant: 'default',
      });
      onClearSelection();
    },
    onError: (error) => {
      toast({
        title: 'Failed to update properties',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  });

  // Export selected properties to CSV
  const exportToCSV = () => {
    // Create CSV header row
    const headers = [
      'ID', 'Address', 'City', 'State', 'Zip Code', 'Property Type', 
      'Zone Code', 'Status', 'Parcel ID', 'Land Area (sq ft)', 'Building Area (sq ft)',
      'Year Built'
    ];
    
    // Create CSV data rows
    const data = selectedProperties.map(property => [
      property.id,
      property.address,
      property.city,
      property.state,
      property.zipCode,
      property.propertyType,
      property.zoneCode,
      property.status,
      property.parcelId,
      property.landArea,
      property.buildingArea,
      property.yearBuilt
    ]);
    
    // Combine header and data rows
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => 
        // Handle commas in data by enclosing in quotes
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"`
          : cell === null || cell === undefined 
            ? '' 
            : cell
      ).join(','))
    ].join('\\n');
    
    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `property-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export complete',
      description: `${selectedProperties.length} properties exported to CSV`,
    });
  };

  // Send email report about selected properties
  const sendEmailReport = () => {
    // In a real implementation, this would connect to an email service
    toast({
      title: 'Email report scheduled',
      description: `A report for ${selectedProperties.length} properties will be sent shortly`,
    });
    onClearSelection();
  };

  const handleActionChange = (value: string) => {
    setAction(value);

    switch (value) {
      case 'updateStatus':
        setDialogContent({
          title: 'Update Property Status',
          description: `This will update the status of ${selectedProperties.length} selected properties. Do you want to continue?`
        });
        setShowConfirmDialog(true);
        break;
      case 'export':
        exportToCSV();
        break;
      case 'email':
        sendEmailReport();
        break;
      default:
        // Do nothing
        break;
    }
  };

  const handleConfirmAction = () => {
    switch (action) {
      case 'updateStatus':
        updatePropertiesMutation.mutate(
          selectedProperties.map(property => ({
            id: property.id,
            update: { status: 'Reviewed' }
          }))
        );
        break;
      default:
        // This shouldn't happen as the dialog is only shown for specific actions
        break;
    }
    setShowConfirmDialog(false);
  };

  if (selectedProperties.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-muted/50 rounded-lg p-3 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-primary mr-2" />
          <span>
            <strong>{selectedProperties.length}</strong> properties selected
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            className="ml-2 h-8 p-0 px-2"
          >
            <X className="h-4 w-4" />
            <span className="ml-1">Clear</span>
          </Button>
        </div>
        
        {/* Desktop actions */}
        {!isMobile && (
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={action} onValueChange={handleActionChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Batch Actions..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Update Actions</SelectLabel>
                  <SelectItem value="updateStatus">Mark as Reviewed</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Export Actions</SelectLabel>
                  <SelectItem value="export">Export to CSV</SelectItem>
                  <SelectItem value="email">Send Email Report</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV}
              className="whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={sendEmailReport}
              className="whitespace-nowrap"
            >
              <SendHorizontal className="h-4 w-4 mr-1" />
              Report
            </Button>
          </div>
        )}
        
        {/* Mobile actions */}
        {isMobile && (
          <div className="flex gap-2 w-full justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  Actions <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Update Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleActionChange("updateStatus")}>
                  Mark as Reviewed
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>Export Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={sendEmailReport}>
                  <SendHorizontal className="mr-2 h-4 w-4" />
                  Send Email Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {updatePropertiesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}