import { api } from "./api";

export type LoginReq = { usuario: string; senha: string };
export type TokenResponse = {
  token: string;
  expiresInSeconds: number;
  user: { login: string; name: string; role: "tecnico" | "secretaria" | "gerente" };
};

export async function login(req: LoginReq): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/api/auth/login", req);
  return data;
}

export async function me() {
  const { data } = await api.get<{ login: string; name: string; role: string }>("/api/auth/me");
  return data;
}
