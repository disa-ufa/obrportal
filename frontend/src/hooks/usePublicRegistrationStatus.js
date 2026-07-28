import { useCallback, useEffect, useState } from "react";

import { getPublicRegistrationStatus } from "../api/client";

export function usePublicRegistrationStatus() {
  const [publicRegistrationEnabled, setPublicRegistrationEnabled] =
    useState(false);
  const [publicRegistrationLoading, setPublicRegistrationLoading] =
    useState(true);

  const loadPublicRegistrationStatus = useCallback(async () => {
    setPublicRegistrationLoading(true);

    try {
      const response = await getPublicRegistrationStatus();
      setPublicRegistrationEnabled(response?.enabled === true);
    } catch {
      setPublicRegistrationEnabled(false);
    } finally {
      setPublicRegistrationLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPublicRegistrationStatus();
  }, [loadPublicRegistrationStatus]);

  return {
    publicRegistrationEnabled,
    publicRegistrationLoading,
  };
}
