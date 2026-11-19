import { useEffect, useState } from "react";
import { captureAuthSession, isCurrentAuthSession, getAdminMintrudSubmissionBatches } from "../../../api/client";
import { validBatchId } from "../../../utils/registryBatchNavigation";
import RegistryBatchCard from "./RegistryBatchCard";

export default function MintrudBatchHistory({ onSelect }) {
  const [state, setState] = useState({ loading: true, batches: [] });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const owner = captureAuthSession();
    setState({ loading: true, batches: [] });
    getAdminMintrudSubmissionBatches().then(rows => {
      if (!Array.isArray(rows) || rows.some(row => row.registry !== "mintrud" || !validBatchId(row.id))) throw Error("Invalid history");
      if (active && isCurrentAuthSession(owner)) setState({ loading: false, batches: rows });
    }).catch(() => {
      if (active && isCurrentAuthSession(owner)) setState({ loading: false, batches: [], error: true });
    });
    return () => { active = false; };
  }, [revision]);
  return <section aria-label="История XML-партий Минтруда">
    <button type="button" disabled={state.loading} onClick={() => setRevision(value => value + 1)}>Обновить историю</button>
    {state.loading ? <p role="status">Загрузка истории…</p> : state.error ? <p role="alert">История недоступна. Повторите чтение.</p> : !state.batches.length ? <p role="status">Ранее сформированных партий нет.</p> : state.batches.map(batch => <RegistryBatchCard key={batch.id} batch={batch} readOnly expanded={false} onToggle={() => onSelect(batch.id)} />)}
  </section>;
}
