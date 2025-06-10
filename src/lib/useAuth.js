import { useState, useEffect } from "react";
import { getRole } from "./auth";

export function useAuth() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const r = getRole();
    setRole(r);
  }, []);

  return { role };
}
