import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getMintrudUiPermissions, captureAuthSession } from "../api/client";
const snapshot = () => { const owner = captureAuthSession(); return owner.accessToken ? owner.generation + ":" + owner.accessToken : ""; };
const subscribe = callback => {
  window.addEventListener("obrportal-auth-change", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("obrportal-auth-change", callback); window.removeEventListener("storage", callback); };
};
const inFlight = new Map();
function readPermissions(session) {
  if (!inFlight.has(session)) {
    const request = getMintrudUiPermissions().finally(() => { if (inFlight.get(session) === request) inFlight.delete(session); });
    inFlight.set(session, request);
  }
  return inFlight.get(session);
}
export function useMintrudPermissions() {
  const session = useSyncExternalStore(subscribe, snapshot, () => "");
  const [state, setState] = useState({ owner: "", permissions: [], revision: 0, checking: true });
  useEffect(() => {
    let alive = true, sequence = 0;
    async function reload() {
      const request = ++sequence;
      access.current.permissions = [];
      setState(s => ({ owner: session, permissions: s.owner === session ? s.permissions : [], revision: s.revision + 1, checking: true }));
      if (!session) return;
      try {
        const permissions = await readPermissions(session);
        if (alive && request === sequence && snapshot() === session) setState(s => ({ owner: session, permissions, revision: s.revision, checking: false }));
      } catch { if (alive && request === sequence) setState(s => ({ owner: session, permissions: [], revision: s.revision, checking: false })); }
    }
    reload(); window.addEventListener("focus", reload);
    return () => { alive = false; ++sequence; window.removeEventListener("focus", reload); };
  }, [session]);
  const effective = state.owner === session ? state.permissions : [];
  const access = useRef({ mounted: true, permissions: [], owner: null });
  access.current.permissions = state.checking ? [] : effective; access.current.owner = captureAuthSession();
  useEffect(() => { access.current.mounted = true; return () => { access.current.mounted = false; }; }, []);
  const canWriteNow = useCallback(() => access.current.mounted && snapshot() === session
    && access.current.permissions.includes("mintrud.read") && access.current.permissions.includes("mintrud.write"), [session]);
  return { permissions: effective, sessionKey: session, revision: state.revision, canWriteNow };
}
