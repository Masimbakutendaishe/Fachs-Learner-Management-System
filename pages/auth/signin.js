// pages/auth/signin.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    // If already signed in, redirect to dashboard
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data?.session) {
        router.push('/dashboard');
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handleSignUp = async () => {
    setMsg('Signing up…');
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? `Sign up error: ${error.message}` : 'Sign-up OK. Please sign in.');
  };

  const handleSignIn = async () => {
    setMsg('Signing in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(`Sign in error: ${error.message}`);
    // successful sign-in should create a session and we redirect
    router.push('/dashboard');
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign In / Sign Up</h1>

      <input
        className="w-full border p-2 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@domain.com"
        type="email"
      />

      <input
        className="w-full border p-2 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        type="password"
      />

      <div className="flex gap-2">
        <button onClick={handleSignUp} className="px-4 py-2 rounded bg-blue-600 text-white">
          Sign Up
        </button>
        <button onClick={handleSignIn} className="px-4 py-2 rounded bg-green-600 text-white">
          Sign In
        </button>
      </div>

      {msg && <p className="text-sm opacity-80">{msg}</p>}
    </main>
  );
}
