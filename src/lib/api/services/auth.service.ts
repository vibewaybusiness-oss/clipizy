// AUTH SERVICE WITH CONSISTENT API PATTERNS
import { BaseApiClient } from '../base';
import type { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse 
} from '@/types/domains';

export class AuthService extends BaseApiClient {
  private readonly basePath = '/auth';

  async signIn(credentials: LoginRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${this.basePath}/login`, credentials);
  }

  async signUp(userData: RegisterRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${this.basePath}/register`, userData);
  }

  async signOut(): Promise<void> {
    return this.post<void>(`${this.basePath}/logout`);
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>(`${this.basePath}/me`);
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    return this.put<User>(`${this.basePath}/profile`, updates);
  }

  async loginWithGoogle(): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${this.basePath}/google`);
  }

  async loginWithGithub(): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${this.basePath}/github`);
  }

  async refreshToken(): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${this.basePath}/refresh`);
  }

  async forgotPassword(email: string): Promise<void> {
    return this.post<void>(`${this.basePath}/forgot-password`, { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.post<void>(`${this.basePath}/reset-password`, { 
      token, 
      password: newPassword 
    });
  }
}

export const authService = new AuthService();
