import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { apiRequest, setAuthToken } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore token from localStorage on page load
    const savedToken = localStorage.getItem("floorpro_token");
    if (savedToken) {
      setToken(savedToken);
      setAuthToken(savedToken);
      // Fetch user data with restored token
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUser(data);
          } else {
            // Token expired — clear it
            localStorage.removeItem("floorpro_token");
            setToken(null);
            setAuthToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("floorpro_token");
          setToken(null);
          setAuthToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setToken(data.token);
    setAuthToken(data.token);
    localStorage.setItem("floorpro_token", data.token);
    setUser(data.user);
  };

  const register = async (username: string, password: string, email?: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, password, email });
    const data = await res.json();
    setToken(data.token);
    setAuthToken(data.token);
    localStorage.setItem("floorpro_token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem("floorpro_token");
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Helper to get auth headers
export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
