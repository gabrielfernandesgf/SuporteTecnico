import axios from "axios";

// Cria instância do axios
export const api = axios.create({
  baseURL: "syndata.elodatacenter.com.br:9090/api",
  headers: { Accept: "application/json" },
  timeout: 15000,
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const url = String(err?.response?.config?.url || "");
    if (status === 401) {
      const hasToken = !!localStorage.getItem("token");
      const onAuthPage = window.location.pathname.startsWith("/auth");
      const isAuthCall = url.includes("/auth/login") || url.includes("/auth/me");

      // Só derruba a sessão se já ESTAVA logado e tomou 401 em rota protegida
      if (hasToken && !onAuthPage && !isAuthCall) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("token_expires_at");
        window.location.replace("/auth");
        return; // interrompe
      }
    }
    return Promise.reject(err);
  }
);