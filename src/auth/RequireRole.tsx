import { Navigate } from "react-router-dom";

export function RequireRole({ role, children }: { role: string; children: JSX.Element }) {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) as { role?: string } : null;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role?.toLowerCase() !== role.toLowerCase()) {
    // Sem permissão -> opcionalmente mandar para uma tela neutra
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
