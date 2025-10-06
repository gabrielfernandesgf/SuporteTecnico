import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu, Home, CalendarDays, ListChecks, Plus, LogOut, User,
} from "lucide-react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // nada pra mostrar se não logado
  if (!userProfile) return null;

  const is = (route: string) => pathname === route || pathname.startsWith(route + "/");
  const go = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const displayName =
    userProfile.name?.trim() ? userProfile.name : `Usuário ${userProfile.user_id ?? ""}`;
  const displayRole =
    (userProfile.role ?? "").toString().toLowerCase().replace(/^./, c => c.toUpperCase());

  return (
    <>
      {/* Topbar fixa (apenas mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b flex items-center gap-3 px-3 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          {/* Largura controlada: não ocupa a tela toda */}
          <SheetContent side="left" className="p-0 w-[18rem] max-w-[85vw]">
            <SheetHeader className="px-4 py-3">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>

            <nav className="px-2 pb-4 overflow-y-auto">
              {/* SECRETARIA */}
              {userProfile.role === "secretaria" && (
                <>
                  <Item active={is("/")} onClick={() => go("/")}>
                    <Home className="mr-2 h-4 w-4" /> Dashboard
                  </Item>
                  <Item active={is("/agenda")} onClick={() => go("/agenda")}>
                    <CalendarDays className="mr-2 h-4 w-4" /> Agenda
                  </Item>
                  <Item active={is("/encaixes")} onClick={() => go("/encaixes")}>
                    <ListChecks className="mr-2 h-4 w-4" /> Encaixes
                  </Item>

                  <div className="border-t my-2" />

                  <Item active={is("/agendamentos/novo")} onClick={() => go("/agendamentos/novo")}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
                  </Item>
                  <Item active={is("/encaixes/novo")} onClick={() => go("/encaixes/novo")}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Encaixe
                  </Item>
                </>
              )}

              {/* TÉCNICO */}
              {userProfile.role === "tecnico" && (
                <>
                  <Item active={is("/tecnico")} onClick={() => go("/tecnico")}>
                    <CalendarDays className="mr-2 h-4 w-4" /> Minha Agenda
                  </Item>
                  <Item active={is("/encaixes")} onClick={() => go("/encaixes")}>
                    <ListChecks className="mr-2 h-4 w-4" /> Encaixes
                  </Item>
                </>
              )}

              <div className="border-t my-2" />

              {/* Conta */}
              <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                <div className="truncate">
                  <div className="text-sm font-medium truncate">{displayName}</div>
                  <div className="capitalize truncate">{displayRole}</div>
                </div>
              </div>
              <Item
                onClick={() => {
                  setOpen(false);
                  signOut();
                  navigate("/auth", { replace: true });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Item>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="font-semibold truncate">Sistema de Agendamento</div>
      </div>
    </>
  );
}

function Item({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left flex items-center px-3 py-2 rounded-md",
        active ? "bg-accent text-foreground" : "hover:bg-accent text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
