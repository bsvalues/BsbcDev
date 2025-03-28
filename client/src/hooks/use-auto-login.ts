import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useAutoLogin() {
  const { toast } = useToast();
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Get current auto-login configuration
  const { 
    data: envData, 
    isLoading,
    refetch
  } = useQuery<{
    environment: string;
    devAutoLogin: boolean;
    devUserId: string;
  }>({
    queryKey: ['/api/env'],
  });

  // Get current user
  const { 
    data: userData,
    refetch: refetchUser
  } = useQuery<{
    id: number;
    username: string;
    email: string;
    role: string;
  }>({
    queryKey: ['/api/users/current'],
    retry: false,
    refetchOnWindowFocus: false
  });

  // Create dev user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Dev User Created',
        description: 'Development user has been created successfully',
        variant: 'default',
      });
      refetchUser();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create development user',
        variant: 'destructive',
      });
    }
  });

  // Update auto-login configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: { enabled: boolean; userId?: string }) => {
      const response = await apiRequest('POST', '/api/autologin/config', config);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Auto-Login Updated',
        description: 'Auto-login configuration has been updated',
        variant: 'default',
      });
      refetch();
      refetchUser();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update auto-login configuration',
        variant: 'destructive',
      });
    }
  });

  // Check and configure auto-login
  useEffect(() => {
    if (envData && !isConfiguring) {
      // If DEV_AUTO_LOGIN is true but no user is authenticated,
      // there might be a configuration issue
      if (envData.devAutoLogin && !userData) {
        setIsConfiguring(true);
        // Try to refresh the user in case the auto-login just needs a nudge
        refetchUser().then(() => {
          setIsConfiguring(false);
        });
      }
    }
  }, [envData, userData, isConfiguring, refetchUser]);

  // Methods for components to use
  const createDevUser = (userData: {
    username: string;
    email: string;
    password: string;
    role: string;
    isDevUser: boolean;
  }) => {
    createUserMutation.mutate(userData);
  };

  const enableAutoLogin = (userId?: string) => {
    updateConfigMutation.mutate({ enabled: true, userId });
  };

  const disableAutoLogin = () => {
    updateConfigMutation.mutate({ enabled: false });
  };

  const testAutoLogin = () => {
    // Force a user refresh to test auto-login
    refetchUser();
  };

  return {
    isAutoLoginEnabled: envData?.devAutoLogin || false,
    devUserId: envData?.devUserId,
    isLoading,
    currentUser: userData,
    createDevUser,
    enableAutoLogin,
    disableAutoLogin,
    testAutoLogin,
    isCreatingUser: createUserMutation.isPending,
    isUpdatingConfig: updateConfigMutation.isPending,
  };
}