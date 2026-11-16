import { captureAuthSession, isCurrentAuthSession } from "../api/client";
// No permission decisions: prevent an old page from continuing work as a new actor.
export function bindRegistrySession(api, owner = captureAuthSession()) {
  const assertCurrent = () => {
    if (!isCurrentAuthSession(owner)) throw new Error("Сессия изменилась. Откройте реестр заново.");
  };
  return Object.fromEntries(Object.entries(api).map(([name, call]) => [name, async (...args) => {
    assertCurrent();
    const result = await call(...args);
    assertCurrent();
    return result;
  }]));
}
