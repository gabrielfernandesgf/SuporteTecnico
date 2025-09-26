import { api } from './api';

class AuthManager {
  private tokenKey = 'token';
  private userKey = 'userData';

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    delete api.defaults.headers.common['Authorization'];
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Verificar se token está expirado (opcional)
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

export const authManager = new AuthManager();