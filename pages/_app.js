// /pages/_app.js
import "../styles/globals.css";
import Layout from "../components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";

export default function MyApp({ Component, pageProps }) {
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
