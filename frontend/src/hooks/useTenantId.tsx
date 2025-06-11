import { useSearchParams, useNavigate } from "react-router-dom";

// Note used anymore can be deleted
export function useTenantId() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tenantId = searchParams.get("tenantId");

  const setTenantId = (newTenantId: string) => {
    searchParams.set("tenantId", newTenantId);
    navigate(`/app?${searchParams.toString()}`);
  };

  return { tenantId, setTenantId };
}
