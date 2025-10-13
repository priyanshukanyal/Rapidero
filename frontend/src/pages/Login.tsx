import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, roleHome } from "../store/auth";

export default function Login() {
  const { login, loading, error, hydrate, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("Passw0rd!");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const home = await login(email, password);
      hydrate();
      nav(home);
    } catch {}
  };

  // If already logged in, push to role home
  if (user) {
    const home = roleHome(user.roles);
    nav(home);
  }

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
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
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
