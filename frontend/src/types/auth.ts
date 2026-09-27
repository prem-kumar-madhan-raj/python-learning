export interface TokenPayload {
  sub: string;
  name: string;
  tenant_id: number;
  role: "admin" | "cashier";
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  business_name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}