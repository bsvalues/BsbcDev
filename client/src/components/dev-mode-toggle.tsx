import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function DevModeToggle() {
  const [isDevMode, setIsDevMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch the current state on mount
  useEffect(() => {
    fetch('/api/env')
      .then(res => res.json())
      .then(data => {
        setIsDevMode(data.useDevMode !== false);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dev mode status:', err);
        setIsLoading(false);
      });
  }, []);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/env/toggle-mode', {
        method: 'POST',
      });
      const data = await response.json();
      
      setIsDevMode(data.useDevMode);
      
      toast({
        title: data.useDevMode ? "Development Mode Enabled" : "Production Mode Enabled",
        description: data.useDevMode 
          ? "Authentication is now bypassed for easier development." 
          : "Authentication is now required for all protected routes.",
        variant: data.useDevMode ? "default" : "destructive",
      });
      
      // Reload to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error toggling dev mode:', error);
      toast({
        title: "Error",
        description: "Failed to toggle development mode",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Application Mode</CardTitle>
        <CardDescription>Toggle between development and production mode</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch 
            id="dev-mode" 
            checked={isDevMode} 
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
          <Label htmlFor="dev-mode" className="text-base">
            {isDevMode ? "Development Mode (Auth Bypassed)" : "Production Mode (Auth Required)"}
          </Label>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {isDevMode 
            ? "In development mode, authentication is bypassed for easier development."
            : "In production mode, authentication is required for all protected routes."
          }
        </p>
      </CardContent>
    </Card>
  );
}

export default DevModeToggle;