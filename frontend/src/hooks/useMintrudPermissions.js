import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getStoredToken, getMintrudUiPermissions, captureAuthSession, isCurrentAuthSession } from "../api/client";
const snapshot = () => { const owner = captureAuthSession(); return owner.accessToken ? owner.generation + ":" + owner.accessToken : ""; };
const subscribe = callback => {
  window.addEventListener("obrportal-auth-change", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("obrportal-auth-change", callback); window.removeEventListener("storage", callback); };
};
export function useMintrudPermissions() {
  const session = useSyncExternalStore(subscribe, snapshot, () => "");
  const [state, setState] = useState({ owner: "", permissions: [], revision: 0 });
  useEffect(() => {
    let alive = true, sequence = 0;
    async function reload() {
      const request = ++sequence;
      access.current.permissions = [];
      setState(s => ({ owner: session, permissions: [], revision: s.revision + 1 }));
      if (!session) return;
      try {
        const permissions = await getMintrudUiPermissions();
        if (alive && request === sequence && snapshot() === session) setState(s => ({ owner: session, permissions, revision: s.revision }));
      } catch { if (alive && request === sequence) setState(s => ({ owner: session, permissions: [], revision: s.revision })); }
    }
    reload(); window.addEventListener("focus", reload);
    return () => { alive = false; ++sequence; window.removeEventListener("focus", reload); };
  }, [session]);
  const effective = state.owner === session ? state.permissions : [];
  const access = useRef({ mounted: true, permissions: [], owner: null });
  access.current.permissions = effective; access.current.owner = captureAuthSession();
  useEffect(() => { access.current.mounted = true; return () => { access.current.mounted = false; }; }, []);
  const owner = access.current.owner;
  const canWriteNow = () => access.current.mounted && isCurrentAuthSession(owner)
    && access.current.permissions.includes("mintrud.read") && access.current.permissions.includes("mintrud.write");
  return { permissions: effective, sessionKey: session, revision: state.revision, canWriteNow };
}
