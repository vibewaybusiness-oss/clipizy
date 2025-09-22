import { BaseApiClient } from './base';
import { API_BASE_URL, API_PATHS } from './config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
    last_login?: string;
  };
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class AuthService extends BaseApiClient {
  private static instance: AuthService;

  constructor() {
    super(API_BASE_URL + API_PATHS.AUTH);
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/login', credentials);
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>('/register', userData);
  }

  async refreshToken(refreshData: RefreshRequest): Promise<RefreshResponse> {
    return this.post<RefreshResponse>('/refresh', refreshData);
  }

  async getCurrentUser(): Promise<any> {
    return this.get<any>('/me');
  }
}

export const authService = AuthService.getInstance();
