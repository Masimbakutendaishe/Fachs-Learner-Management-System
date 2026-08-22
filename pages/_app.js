// /pages/_app.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";
import Layout from "../components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery") && router.pathname !== "/reset-password") {
      router.replace(`/reset-password${window.location.hash}`);
    }
  }, []);

  return (
    <AuthProvider>
      <UserProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </UserProvider>
    </AuthProvider>
  );
}
