import { Link, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogOut, User, CalendarDays, Home, Plus, ListChecks } from "lucide-react";

import Dashboard from "./Dashboard";
import AgendamentoNovo from "./AgendamentoNovo";
import EncaixeNovoPage from "./EncaixeNovo";
import EncaixesListPage from "./EncaixesList";
import AgendaTabela from "./AgendaTabela";
import { useAuth } from "@/hooks/useAuth";
import TecnicoView from "./TecnicoView";
import { useEffect } from "react";

export default function Index() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (userProfile?.role === "tecnico" && location.pathname === "/") {
      navigate("/tecnico", { replace: true });
    }
  }, [userProfile, location.pathname, navigate]);

  const handleLogout = () => {
    signOut();
    navigate("/auth", { replace: true });
  };

  const displayName =
    (userProfile?.name && userProfile.name.trim() !== "")
      ? userProfile.name
      : `Usuário ${userProfile?.user_id ?? ""}`;

  const displayRole =
    (userProfile?.role ?? "").toString().toLowerCase().replace(/^./, c => c.toUpperCase());

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        {/* Lateral */}
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Sistema de Agendamento</h1>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {userProfile?.role === "secretaria" && (
              <>
                {/* Menu */}
                < SidebarGroup >
                  <SidebarGroupLabel>Menu</SidebarGroupLabel>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/">
                          <Home className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/agenda">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          <span>Agenda</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </>
            )}

            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/encaixes">
                    <ListChecks className="mr-2 h-4 w-4" />
                    <span>Encaixes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {userProfile?.role === "tecnico" && (
              <>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/tecnico">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        <span>Minha Agenda</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </>
            )}


            {/* Ações */}
            {userProfile?.role === "secretaria" && (
              <>
            <SidebarGroup>
              <SidebarGroupLabel>Ações</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/agendamentos/novo">
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Novo Agendamento</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/encaixes/novo">
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Novo Encaixe</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            </>
            )}

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Conta</SidebarGroupLabel>
              <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-4 w-4" />
                <div className="truncate">
                  <div className="text-sm font-medium truncate">{displayName}</div>
                  <div className="capitalize truncate">{displayRole}</div>
                </div>
              </div>

              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex-1 min-w-0 w-full max-w-none p-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<AgendaTabela />} />
            <Route path="/agendamentos/novo" element={<AgendamentoNovo />} />
            <Route path="/encaixes" element={<EncaixesListPage />} />
            <Route path="/tecnico" element={<TecnicoView />} />
            <Route
              path="encaixes/novo"
              element={<EncaixeNovoPage onVoltar={() => navigate(-1)} />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </SidebarInset>
      </div>
    </SidebarProvider >
  );
}
