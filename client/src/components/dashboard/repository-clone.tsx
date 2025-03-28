import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function RepositoryClone() {
  const { toast } = useToast();
  const [isCloneComplete, setIsCloneComplete] = useState(false);
  
  const handleCloneComplete = () => {
    setIsCloneComplete(true);
    toast({
      title: "Clone Complete",
      description: "Repository has been successfully cloned",
      variant: "default",
    });
    
    // Scroll to next section after delay
    setTimeout(() => {
      window.location.hash = "environment";
    }, 1000);
  };
  
  const handlePullLatest = () => {
    toast({
      title: "Pulling Latest",
      description: "Fetching latest changes from the repository",
    });
  };
  
  return (
    <section id="clone" className="mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Repository Clone</h2>
        <p className="mb-4">Clone the BSBC repository to your local development environment.</p>
        
        <div className="code-block mb-4 bg-[#f5f5f5] rounded-md p-4 font-mono overflow-x-auto">
          <pre>
            <span className="text-green-600"># Clone the repository</span>{"\n"}
            <span className="text-amber-700">git</span> <span className="text-blue-600">clone</span> <span className="text-red-600">https://github.com/bsvalues/BsbcDev.git</span>{"\n\n"}
            <span className="text-green-600"># Navigate to the project directory</span>{"\n"}
            <span className="text-amber-700">cd</span> BsbcDev
          </pre>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Verify Repository Access</h3>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-4 h-4 rounded-full bg-success"></span>
            <span>GitHub Authentication Successful</span>
          </div>
        </div>
        
        <div className="bg-light p-4 rounded-lg mb-4">
          <h3 className="text-lg font-medium mb-2">Clone Status</h3>
          <div className="flex items-center mb-2">
            <div className="w-32">Repository:</div>
            <div className="text-success font-medium">Connected</div>
          </div>
          <div className="flex items-center mb-2">
            <div className="w-32">Branch:</div>
            <div>main</div>
          </div>
          <div className="flex items-center">
            <div className="w-32">Last Commit:</div>
            <div>a3f72e5 (2 days ago)</div>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-4">
          <button 
            className={`${isCloneComplete ? "bg-success" : "bg-primary"} hover:opacity-90 text-white px-4 py-2 rounded-md transition-colors flex items-center`}
            onClick={handleCloneComplete}
          >
            <i className={`fas ${isCloneComplete ? "fa-check" : "fa-code-branch"} mr-2`}></i>
            {isCloneComplete ? "Clone Complete" : "Clone Repository"}
          </button>
          <button 
            className="border border-dark-light hover:bg-light text-dark-medium px-4 py-2 rounded-md transition-colors flex items-center"
            onClick={handlePullLatest}
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Pull Latest
          </button>
        </div>
      </div>
    </section>
  );
}

export default RepositoryClone;
