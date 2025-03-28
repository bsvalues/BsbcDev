import { useEffect, useState } from "react";

interface Step {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  position: number;
}

const steps: Step[] = [
  { id: "clone", label: "Clone", status: "completed", position: 0 },
  { id: "setup", label: "Setup", status: "current", position: 25 },
  { id: "config", label: "Config", status: "upcoming", position: 50 },
  { id: "verify", label: "Verify", status: "upcoming", position: 75 },
  { id: "launch", label: "Launch", status: "upcoming", position: 100 },
];

export function ProgressTracker() {
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const progressWidth = `${25 * currentStepIndex}%`;

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "clone") {
        setCurrentStepIndex(1);
      } else if (hash === "environment") {
        setCurrentStepIndex(2);
      } else if (
        hash === "autologin" ||
        hash === "structure" ||
        hash === "tenants" ||
        hash === "subscriptions"
      ) {
        setCurrentStepIndex(3);
      } else if (hash === "verification") {
        setCurrentStepIndex(4);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <h3 className="text-lg font-medium mb-4">Setup Progress</h3>
      <div className="flex items-center">
        <div className="relative w-full">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-primary rounded-full"
              style={{ width: progressWidth }}
            ></div>
          </div>

          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex - 1;
            
            return (
              <div
                key={step.id}
                className="absolute top-0 -mt-2 flex flex-col items-center"
                style={{ left: `${step.position}%` }}
              >
                <div
                  className={`rounded-full h-6 w-6 ${
                    isCompleted || isCurrent
                      ? "bg-primary text-white"
                      : "bg-gray-300 text-dark-medium"
                  } flex items-center justify-center`}
                >
                  {isCompleted ? (
                    <i className="fas fa-check text-xs"></i>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className="text-xs mt-1">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProgressTracker;
