import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Dashboard from "./Dashboard";
import TecnicoView from "./TecnicoView";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { userProfile } = useAuth();
  const [currentView, setCurrentView] = useState<"dashboard" | "tecnico">("dashboard");

  // Direcionar técnicos automaticamente para sua visão
  useEffect(() => {
    if (userProfile?.role === "tecnico") {
      setCurrentView("tecnico");
    }
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="container mx-auto">
        {currentView === "dashboard" ? <Dashboard /> : <TecnicoView />}
      </div>
    </div>
  );
};

export default Index;