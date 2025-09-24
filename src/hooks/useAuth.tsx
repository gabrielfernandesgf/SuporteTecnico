import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/services/AuthService";
import { listarSecretarias, listarTecnicos } from "@/services/usuarios";
import { LoginRequest, Usuario } from "@/types/types";

type Ctx = {
  user: Usuario | null;
  userProfile: Usuario | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (c: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
};
const AuthContext = createContext<Ctx | undefined>(undefined);

function normalizeUser(raw: any): Usuario {
  const id = Number(raw?.user_id ?? raw?.id ?? raw?.CODIGO ?? raw?.codigo ?? NaN);
  const name = String(raw?.name ?? raw?.nome ?? raw?.NOME ?? "");
  const roleRaw =
    raw?.role ?? raw?.tipoUsuario ?? raw?.tipo ?? raw?.ATRIBUICAO ?? raw?.atribuicao ?? "";
  const role = String(roleRaw).toLowerCase();
  return { ...raw, user_id: id, id, name, role } as Usuario;
}

async function hydrateUserName(u: Usuario): Promise<Usuario> {
  const isPlaceholder = !u?.name || /^Usuário\s+\d+$/i.test(String(u.name).trim());
  if (!isPlaceholder) {
    localStorage.setItem("user", JSON.stringify(u));
    return u;
  }
  const myId = Number(u.user_id);
  let nome = "";
  let role = (u.role ?? "").toLowerCase();

  const [secs, tecs] = await Promise.all([
    listarSecretarias().catch(() => [] as Usuario[]),
    listarTecnicos().catch(() => [] as Usuario[]),
  ]);

  const sec = secs.find((s) => Number(s.user_id) === myId);
  const tec = tecs.find((t) => Number(t.user_id) === myId);
  if (sec) {
    nome = sec.name;
    role = role || "secretaria";
  } else if (tec) {
    nome = tec.name;
    role = role || "tecnico";
  }

  const hydrated = { ...u, name: nome || u.name || "", role: role || u.role || "" } as Usuario;
  localStorage.setItem("user", JSON.stringify(hydrated));
  return hydrated;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [userProfile, setUserProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const saved = localStorage.getItem("user");
      if (!token) {
        setUser(null);
        setUserProfile(null);
        return;
      }
      if (saved) {
        const parsed = normalizeUser(JSON.parse(saved));
        setUser(parsed);
        setUserProfile(parsed);
        if (!parsed.name || /^Usuário\s+\d+$/i.test(parsed.name)) {
          hydrateUserName(parsed)
            .then((hydr) => {
              setUser(hydr);
              setUserProfile(hydr);
            })
            .catch(() => void 0);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (credentials: LoginRequest) => {
    try {
      setLoading(true);

      const r = await authService.login(credentials);
      if (!r.success) return { success: false, error: r.error };

      // 1) Salva token numa única chave
      localStorage.setItem("token", r.token);
      if (r.expiresInSeconds && Number.isFinite(r.expiresInSeconds)) {
        const expAt = Date.now() + r.expiresInSeconds * 1000;
        localStorage.setItem("token_expires_at", String(expAt));
      }

      // 2) Garante ter usuário
      const rawUser = r.user ?? (await authService.me()).valueOf();
      const normalized = normalizeUser(
        rawUser ?? { user_id: Number(credentials.usuario), name: `Usuário ${credentials.usuario}`, role: "" }
      );

      setUser(normalized);
      setUserProfile(normalized);
      localStorage.setItem("user", JSON.stringify(normalized));

      // 3) Hidrata o nome em background
      hydrateUserName(normalized)
        .then((hydr) => {
          setUser(hydr);
          setUserProfile(hydr);
        })
        .catch(() => void 0);

      return { success: true };
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        "Falha ao autenticar. Verifique suas credenciais.";
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("token_expires_at");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAuthenticated: !!user && !!localStorage.getItem("token"),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
