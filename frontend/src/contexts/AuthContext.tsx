import { type AuthUser,loginApi, meApi, registerApi } from '@api/auth';
import { clearTokens, getAccessToken, storeTokens } from '@api/client';
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useState
} from 'react';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, fullName?: string) => Promise<AuthUser>;
  logout: () => void;
  hydrateFromTokens: (accessToken: string, refreshToken: string) => Promise<AuthUser>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    meApi()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { accessToken, refreshToken } = await loginApi(email, password);
    storeTokens(accessToken, refreshToken);
    const me = await meApi();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName?: string): Promise<AuthUser> => {
      const { accessToken, refreshToken } = await registerApi(email, password, fullName);
      storeTokens(accessToken, refreshToken);
      const me = await meApi();
      setUser(me);
      return me;
    },
    []
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const hydrateFromTokens = useCallback(
    async (accessToken: string, refreshToken: string): Promise<AuthUser> => {
      storeTokens(accessToken, refreshToken);
      const me = await meApi();
      setUser(me);
      return me;
    },
    []
  );

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      hydrateFromTokens 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
