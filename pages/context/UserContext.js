import { useAuth } from "./AuthContext";

export function UserProvider({ children }) {
  return children;
}

export const useUser = () => {
  const { user } = useAuth();
  return { user, setUser: () => {} };
};