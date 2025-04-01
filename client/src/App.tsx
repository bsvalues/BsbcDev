import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import PropertiesPage from "@/pages/properties";
import TenantsTestPage from "@/pages/TenantsTestPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/tenants/test" component={TenantsTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
