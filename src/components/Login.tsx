import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";

const Login = ({ supabase }: { supabase: SupabaseClient }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Reset error message
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <form className="flex flex-col items-center p-2" onSubmit={handleLogin}>
      <label htmlFor="email" className="mb-2">
        Email:
      </label>
      <input
        type="email"
        className="border"
        id="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <label htmlFor="password" className="mt-2 mb-2">
        Password:
      </label>
      <input
        type="password"
        className="border"
        id="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
      />
      {error && <p className="bg-red-200 mt-2 p-1 rounded-2xl">{error}</p>}
      <button type="submit" className="border hover:bg-gray-100 mt-2">
        Login
      </button>
    </form>
  );
};

export default Login;
