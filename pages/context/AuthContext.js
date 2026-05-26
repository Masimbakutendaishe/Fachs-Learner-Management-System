import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const AuthContext = createContext();

const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

export function AuthProvider({ children }) {
  const router = useRouter();
  const timeoutRef = useRef(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restore session on refresh
  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      setIsAuthenticated(true);
      resetTimer();
    }
  }, []);

  // Activity listeners
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];

    const handleActivity = () => resetTimer();

    events.forEach(event =>
      window.addEventListener(event, handleActivity)
    );

    return () => {
      events.forEach(event =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, []);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      logout(true);
    }, INACTIVITY_LIMIT);
  };

  const login = (userData) => {
    localStorage.setItem("session", JSON.stringify(userData));
    setIsAuthenticated(true);
    resetTimer();
  };

  const logout = (inactive = false) => {
    localStorage.removeItem("session");
    setIsAuthenticated(false);
    clearTimeout(timeoutRef.current);

    router.push(inactive ? "/login?reason=inactive" : "/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
