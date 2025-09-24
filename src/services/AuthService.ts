import { api } from "./api";
import { Usuario, LoginRequest } from "@/types/types";

type LoginOk = {
  success: true;
  token: string;
  user?: Usuario;
  expiresInSeconds?: number;
};
type LoginFail = { success: false; error: string };
export type LoginResult = LoginOk | LoginFail;

// Converte os diferentes formatos que sua API pode devolver (com/sem "data")
function extractLogin(data: any): { token?: string; user?: Usuario; exp?: number } {
  if (!data) return {};
  if (data.access_token) {
    return { token: data.access_token, user: data.user, exp: data.expires_in };
  }
  if (data.data?.access_token) {
    return { token: data.data.access_token, user: data.data.user, exp: data.data.expires_in };
  }
  return {};
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const res = await api.post("/auth/login", credentials);
      const { token, user, exp } = extractLogin(res.data);
      if (!token) return { success: false, error: "Token não retornado pela API." };
      return { success: true, token, user, expiresInSeconds: exp };
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        e?.message ??
        "Erro ao autenticar";
      return { success: false, error: msg };
    }
  }

  async me(): Promise<Usuario> {
    const { data } = await api.get("/auth/me");
    return data as Usuario;
  }
}

export const authService = new AuthService();
