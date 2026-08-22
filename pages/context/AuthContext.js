import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "../../lib/supabase/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [institution, setInstitution] = useState(null);

  const loadProfile = async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setInstitution(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*, institutions(*)")
      .eq("id", authUser.id)
      .single();
    setProfile(data || null);
    setInstitution(data?.institutions || null);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        router.push("/reset-password");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        institution,
        role: profile?.role ?? null,
        isAuthenticated: !!user,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);