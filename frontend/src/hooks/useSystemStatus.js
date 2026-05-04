import { useState } from "react";

import { getHealth, getReady } from "../api/client";

export function useSystemStatus() {
  const [health, setHealth] = useState(null);
  const [ready, setReady] = useState(null);

  async function loadSystemStatus() {
    try {
      const [healthData, readyData] = await Promise.all([
        getHealth(),
        getReady(),
      ]);

      setHealth(healthData);
      setReady(readyData);
    } catch {
      setHealth({ status: "error" });
      setReady({ status: "error" });
    }
  }

  return {
    health,
    ready,
    loadSystemStatus,
  };
}
