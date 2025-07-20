import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Users, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavigationProps {
  currentView: "dashboard" | "tecnico";
  onViewChange: (view: "dashboard" | "tecnico") => void;
}

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const { userProfile, signOut } = useAuth();
  
  if (!userProfile) return null;

  return (
    <nav className="bg-card border-b border-border p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Controle de Técnicos</h2>
            <p className="text-sm text-muted-foreground">Sistema de Agendamentos</p>
          </div>
          
          {userProfile.role === "secretaria" && (
            <div className="flex space-x-2">
              <Button
                variant={currentView === "dashboard" ? "default" : "outline"}
                onClick={() => onViewChange("dashboard")}
                className="flex items-center"
              >
                <Monitor className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={currentView === "tecnico" ? "default" : "outline"}
                onClick={() => onViewChange("tecnico")}
                className="flex items-center"
              >
                <Users className="mr-2 h-4 w-4" />
                Visão Técnico
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{userProfile.name}</p>
            <div className="flex items-center space-x-2">
              <Badge variant={userProfile.role === "secretaria" ? "default" : "secondary"}>
                {userProfile.role === "secretaria" ? "Secretária" : "Técnico"}
              </Badge>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;