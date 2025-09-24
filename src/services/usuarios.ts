import { api } from "./api";

export interface UsuarioDTO {
  user_id: string;
  name: string;
  role?: string;
}

export async function listarTecnicos(): Promise<UsuarioDTO[]> {
  const r = await api.get<UsuarioDTO[]>("/funcionarios/tecnicos");
  return Array.isArray(r.data) ? r.data : [];
}

export async function listarSecretarias(): Promise<UsuarioDTO[]> {
  const r = await api.get<UsuarioDTO[]>("/funcionarios/secretarias");
  return Array.isArray(r.data) ? r.data : [];
}
