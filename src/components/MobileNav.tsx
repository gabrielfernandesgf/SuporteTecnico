import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { Menu, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  return (
    <div className="md:hidden sticky top-0 z-40 bg-background border-b">
      <div className="h-12 px-3 flex items-center justify-between">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[85vw] p-0">
            <SheetHeader className="p-4 items-start">
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <Separator />
            <nav className="p-3 space-y-1">
              <NavLink
                to="/"
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md ${
                    isActive ? "bg-accent text-foreground" : "hover:bg-accent/60 text-muted-foreground"
                  }`
                }
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </NavLink>

              <Separator className="my-2" />
              <Button
                onClick={() => {
                  signOut();
                  close();
                  navigate("/auth");
                }}
                variant="destructive"
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="text-sm font-medium">Sistema de Agendamento</div>
        <div className="w-10" /> {/* espaçador para centralizar o título */}
      </div>
    </div>
  );
}
