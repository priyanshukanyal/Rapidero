import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../store/auth";

export default function Login() {
  const { login, loading, error, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.com"); // remove in prod
  const [password, setPassword] = useState("Passw0rd!"); // remove in prod

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // Do NOT navigate here; let the effect below handle redirects
      await login(email, password);
    } catch {
      // no-op; error is already set in the store
    }
  };

  // Single source of truth for redirects:
  // - if user already logged in and lands on /login, redirect
  // - after successful login (user changes), redirect
  useEffect(() => {
    if (!user) return;
    const home = roleHome(user.roles);
    nav(home, { replace: true });
  }, [user, nav]);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm">Email</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white py-2 rounded-md"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-3">
        Use the same credentials bootstrapped on the backend.
      </p>
    </div>
  );
}
