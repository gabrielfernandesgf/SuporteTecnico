import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { me } from "../services/auth";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setOk(false); return; }
    me()
      .then((u) => { localStorage.setItem("user", JSON.stringify(u)); setOk(true); })
      .catch(() => { setOk(false); });
  }, []);

  if (ok === null) return null;               // loading skeleton opcional
  if (!ok) return <Navigate to="/auth" replace />;
  return children;
}
