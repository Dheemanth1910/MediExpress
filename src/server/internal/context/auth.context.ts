export interface AuthContext {
  userId: string;
  subTenantId: string | null;
  roles: number[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
