import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { api, formatApiErrorDetail } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user: null = unknown (still checking), false = unauthenticated, object = authenticated
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      // 401 here is expected when there is no active session — treat any failure as unauthenticated.
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always check via cookie on mount — cheap and safe (single request).
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: formatApiErrorDetail(e.response?.data?.detail) || e.message,
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network error on logout — clear client state regardless
    }
    setUser(false);
  }, []);

  // Stable provider value to avoid re-rendering all consumers each render.
  const value = useMemo(
    () => ({ user, loading, login, logout, refresh: fetchMe }),
    [user, loading, login, logout, fetchMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
