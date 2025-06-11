import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoginProps {
  login: (tenantId: string, password: string) => Promise<boolean>;
}

export default function Login({ login }: LoginProps) {
  const [tenantId, setTenantId] = useState("");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(tenantId, password);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur inconnue");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 max-w-sm mx-auto mt-20 border rounded-xl shadow-md">
      <h1 className="text-xl font-bold text-center">Connexion</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="Tenant ID"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          required
        />
        <Input
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full">
          Se connecter
        </Button>
      </form>
    </div>
  );
}
