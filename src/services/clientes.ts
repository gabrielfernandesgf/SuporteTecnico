import { ApiResponse } from "@/types/types";
import { api } from "./api";

export interface Cliente {
  id: number;
  nome: string;
  cpf: string | null;
  fone: string | null;
  cnpj: string | null;
  endereco: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  bairro: string | null;
  cidade: string | null;
  cep: string | null;
  empresa: number | null;
  codGrupo: number | null;
}

class ClienteService {
  async listarClientes(query?: string): Promise<ApiResponse<Cliente[]>> {
    try {
      const { data } = await api.get<Cliente[]>("/clientes", {
        params: query ? { q: query } : undefined,
      });
      return { success: true, data };
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Erro ao buscar clientes";
      return { success: false, error: msg };
    }
  }

  async buscarClientePorId(id: number): Promise<ApiResponse<Cliente>> {
    try {
      const { data } = await api.get<Cliente>(`/clientes/${id}`);
      return { success: true, data };
    } catch (e: any) {
      const msg =
        e?.response?.status === 404
          ? "Cliente não encontrado"
          : e?.response?.data?.message ?? e?.message ?? "Erro ao buscar cliente";
      return { success: false, error: msg };
    }
  }
}

export const clienteService = new ClienteService();
export const buscarClientes = clienteService.listarClientes.bind(clienteService);
export const listarClientes = clienteService.listarClientes.bind(clienteService);
export const buscarClientePorId = clienteService.buscarClientePorId.bind(clienteService);

// Helper compatível com o restante do app
export async function buscarClientesArray(q: string): Promise<Cliente[]> {
  const resp = await clienteService.listarClientes(q);
  return resp.success ? resp.data ?? [] : [];
}
