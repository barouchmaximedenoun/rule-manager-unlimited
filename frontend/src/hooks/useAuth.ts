import { useState, useEffect } from 'react';
import axios from 'axios';

export function useAuth() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/me', { withCredentials: true })
      .then(res => setTenantId(res.data.tenantId))
      .catch(() => setTenantId(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (tenantId: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      await axios.post('/api/login', { tenantId, password }, { withCredentials: true });
      const res = await axios.get('/api/me', { withCredentials: true });
      setTenantId(res.data.tenantId);
      setLoading(false)
      return true;
    } catch {
      setTenantId(null);
      setLoading(false)
      return false;
    }
  };

  const logout = async () => {
    await axios.post('/api/logout', {}, { withCredentials: true });
    setTenantId(null);
  };

  return { tenantId, loading, login, logout };
}
