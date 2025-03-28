import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export function SubscriptionConfig() {
  const { toast } = useToast();
  const [gateway, setGateway] = useState("stripe");
  const [apiKey, setApiKey] = useState("sk_test_...");
  const [webhookSecret, setWebhookSecret] = useState("whsec_...");
  
  const [trialFeature, setTrialFeature] = useState(true);
  const [planSwitchingFeature, setPlanSwitchingFeature] = useState(true);
  const [usageBasedFeature, setUsageBasedFeature] = useState(true);
  const [teamBillingFeature, setTeamBillingFeature] = useState(false);
  
  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/plans"],
  });
  
  const handleSaveConfig = () => {
    toast({
      title: "Configuration Saved",
      description: "Subscription configuration has been saved",
      variant: "default",
    });
  };
  
  const handleTestPayment = () => {
    toast({
      title: "Test Payment Flow",
      description: "Payment flow test initiated",
    });
    
    // Move to verification section
    setTimeout(() => {
      window.location.hash = "verification";
    }, 1000);
  };

  return (
    <section id="subscriptions" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Subscription Configuration</h2>
        <p className="mb-4">Set up and manage subscription models for the SaaS application.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.isArray(plans) && plans.map((plan: any) => (
            <div key={plan.id} className="border rounded-lg p-4 relative">
              <div className="absolute top-2 right-2">
                <button className="text-primary hover:text-secondary">
                  <i className="fas fa-edit"></i>
                </button>
              </div>
              <h3 className="font-medium mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
              <div className="text-2xl font-bold mb-3">
                ${(plan.price / 100).toFixed(2)}
                {plan.price > 0 && <span className="text-sm font-normal">/month</span>}
              </div>
              <ul className="text-sm space-y-1 mb-4">
                {plan.features && plan.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center">
                    <i className={`fas ${index < plan.features.length - 1 ? "fa-check text-success" : "fa-times text-error"} mr-2`}></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t">
                <div className="text-sm">Status: <span className="text-success">Active</span></div>
              </div>
            </div>
          ))}
        </div>
        
        <h3 className="text-lg font-medium mb-2">Payment Gateway</h3>
        <div className="border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="stripe" 
                    name="gateway" 
                    className="w-4 h-4 text-primary focus:ring-primary" 
                    checked={gateway === "stripe"}
                    onChange={() => setGateway("stripe")}
                  />
                  <label htmlFor="stripe" className="ml-2">Stripe</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="paypal" 
                    name="gateway" 
                    className="w-4 h-4 text-primary focus:ring-primary"
                    checked={gateway === "paypal"}
                    onChange={() => setGateway("paypal")}
                  />
                  <label htmlFor="paypal" className="ml-2">PayPal</label>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">API Key (Development)</label>
                  <input 
                    type="text" 
                    placeholder="sk_test_..." 
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Webhook Secret</label>
                  <input 
                    type="text" 
                    placeholder="whsec_..." 
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50" 
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Subscription Features</h4>
              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="feature1" 
                    className="w-4 h-4 text-primary focus:ring-primary" 
                    checked={trialFeature}
                    onChange={() => setTrialFeature(!trialFeature)}
                  />
                  <label htmlFor="feature1" className="ml-2">Trial periods</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="feature2" 
                    className="w-4 h-4 text-primary focus:ring-primary" 
                    checked={planSwitchingFeature}
                    onChange={() => setPlanSwitchingFeature(!planSwitchingFeature)}
                  />
                  <label htmlFor="feature2" className="ml-2">Plan switching</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="feature3" 
                    className="w-4 h-4 text-primary focus:ring-primary" 
                    checked={usageBasedFeature}
                    onChange={() => setUsageBasedFeature(!usageBasedFeature)}
                  />
                  <label htmlFor="feature3" className="ml-2">Usage-based billing</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="feature4" 
                    className="w-4 h-4 text-primary focus:ring-primary"
                    checked={teamBillingFeature}
                    onChange={() => setTeamBillingFeature(!teamBillingFeature)}
                  />
                  <label htmlFor="feature4" className="ml-2">Team billing</label>
                </div>
              </div>
              
              <div className="bg-light p-3 rounded text-sm">
                <p className="font-medium mb-1">Development Mode</p>
                <p>Payment processing is simulated in development environment. No actual charges will be made.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-4">
          <button 
            className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleSaveConfig}
          >
            <i className="fas fa-save mr-2"></i>
            Save Configuration
          </button>
          <button 
            className="border border-dark-light hover:bg-light text-dark-medium px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handleTestPayment}
          >
            <i className="fas fa-credit-card mr-2"></i>
            Test Payment Flow
          </button>
        </div>
      </div>
    </section>
  );
}

export default SubscriptionConfig;
