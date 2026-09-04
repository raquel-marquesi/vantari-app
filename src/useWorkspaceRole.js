import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";

// Papel do usuário logado no workspace Vantari ("owner" | "admin" | "member" | "captador" | null enquanto carrega)
export function useWorkspaceRole() {
  const [role, setRole] = useState(undefined);

  useEffect(() => {
    let active = true;
    supabase
      .rpc("current_role_in_workspace", { _workspace_id: WORKSPACE_VANTARI })
      .then(({ data, error }) => {
        if (!active) return;
        setRole(error ? null : data || null);
      });
    return () => { active = false; };
  }, []);

  return role;
}
