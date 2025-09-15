import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";

const Login = ({ supabase }: { supabase: SupabaseClient }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 grid place-items-center p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-indigo-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-xl backdrop-blur px-6 py-7"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          {/* Inline SVG logo */}
          <div className="mx-auto mb-3 h-12 w-12">
            <svg
              viewBox="0 0 64 64"
              role="img"
              aria-label="App logo"
              className="h-12 w-12 drop-shadow"
            >
              <defs>
                <linearGradient id="logoGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                </filter>
              </defs>
              {/* Outer rounded shape */}
              <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="14"
                fill="url(#logoGradient)"
                filter="url(#softShadow)"
              />
              {/* Inner cutout ring */}
              <circle
                cx="32"
                cy="32"
                r="17"
                fill="none"
                stroke="white"
                strokeOpacity="0.85"
                strokeWidth="4"
              />
              {/* Stylized monogram mark */}
              <path
                d="M24 22h12.5c4.5 0 7.5 2.7 7.5 6.6c0 3.2-1.9 5.6-4.9 6.5v.1c2.7.7 4.4 2.8 4.4 5.7c0 4.3-3.3 7.1-8.7 7.1H24V22zm7.8 10.8c2.6 0 4.2-1.2 4.2-3.3s-1.6-3.2-4.2-3.2H29v6.5h2.8zm.9 12.2c3 0 4.9-1.4 4.9-3.8c0-2.3-1.9-3.6-4.9-3.6H29v7.4h3.7z"
                fill="#ffffff"
                fillOpacity="0.95"
              />
            </svg>
          </div>

          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Email */}
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-800 dark:text-slate-100 shadow-sm outline-none
                     focus:border-teal-400 focus:ring-4 focus:ring-teal-400/20
                     placeholder:text-slate-400"
          placeholder="you@example.com"
          required
        />

        {/* Password */}
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-800 dark:text-slate-100 shadow-sm outline-none
                     focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20
                     placeholder:text-slate-400"
          placeholder="••••••••"
          required
        />

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-200/70 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md
                     hover:from-teal-600 hover:to-indigo-600
                     focus:outline-none focus:ring-4 focus:ring-indigo-400/30
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {isLoading ? "Signing in..." : "Login"}
        </button>

        {/* Helper text */}
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Protected by Supabase Auth
        </p>
      </form>
    </div>
  );
};

export default Login; 