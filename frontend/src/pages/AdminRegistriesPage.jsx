import { useEffect, useState } from "react";
import { captureAuthSession } from "../api/client";
import FrdoRegistryWorkspace from "./FrdoRegistryWorkspace";
import { MainMintrudRegistriesPage } from "./MainMintrudRegistriesPage";
import { RegistryNavigation } from "../components/admin/registries/RegistryWorkspace";
import SelectedRegistryBatch from "../components/admin/registries/SelectedRegistryBatch";

function locationState() {
  const query = new URLSearchParams(window.location.search);
  return { registry: query.get("registry") === "mintrud" ? "mintrud" : "frdo", view: query.get("registryView") || "overview", batch: query.get("batchId") || "" };
}
function RegistrySession() {
  const [route, setRoute] = useState(locationState);
  useEffect(() => {
    const sync = () => setRoute(locationState());
    window.addEventListener("popstate", sync);
    window.addEventListener("obrportal-registry-navigation", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("obrportal-registry-navigation", sync); };
  }, []);
  function navigate(registry, view = "work", batch = "") {
    const url = new URL(window.location.href);
    url.searchParams.set("registry", registry);
    url.searchParams.set("registryView", view);
    url.searchParams.delete("batchId");
    if (batch) url.searchParams.set("batchId", batch);
    window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("obrportal-registry-navigation"));
  }
  return <>
    {/* Kept mounted across registry/view switches: one creation owner and one submission fence. */}
    <div hidden={route.registry !== "frdo"}><FrdoRegistryWorkspace active={route.registry === "frdo"} onMintrud={() => navigate("mintrud")} /></div>
    {route.registry === "mintrud" && <section>
      <RegistryNavigation registry="mintrud" view={route.view} onNavigate={key => navigate(key === "frdo" ? "frdo" : "mintrud", ["overview", "batches"].includes(key) ? key : "work")} />
      {route.view === "batches" ? <>
        <h2 className="text-lg font-bold">Партии и отправки · Минтруд</h2>
        <div role="group" aria-label="Реестр партий"><button onClick={() => navigate("frdo", "batches")}>ФРДО · XLSX</button><button onClick={() => navigate("mintrud", "batches")}>Минтруд · XML v1.0.9</button></div>
        <p>Режим просмотра партии не предоставляет право экспорта. Рабочие действия доступны в разделе Минтруд.</p>
        {route.batch && <SelectedRegistryBatch key={`mintrud:${route.batch}`} registry="mintrud" id={route.batch} onClose={() => navigate("mintrud", "batches")} />}
      </> : <MainMintrudRegistriesPage onFrdo={() => navigate("frdo")} />}
    </section>}
  </>;
}
export function AdminRegistriesPage() {
  const [session, setSession] = useState(captureAuthSession);
  useEffect(() => {
    const sync = () => setSession(captureAuthSession());
    window.addEventListener("obrportal-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("obrportal-auth-change", sync); window.removeEventListener("storage", sync); };
  }, []);
  return <RegistrySession key={session.generation} />;
}
