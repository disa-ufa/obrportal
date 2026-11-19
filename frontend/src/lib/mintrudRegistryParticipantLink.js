const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMintrudParticipantLink(hash) {
  if (typeof hash !== "string" || !hash.startsWith("#participant=")) {
    return null;
  }

  const parts = hash.slice("#participant=".length).split(":");

  if (parts.length !== 2) return null;

  try {
    const [protocolId, enrollmentId] = parts.map(decodeURIComponent);

    if (!UUID.test(protocolId) || !UUID.test(enrollmentId)) return null;

    return { protocolId, enrollmentId };
  } catch {
    return null;
  }
}

export function resolveMintrudParticipantObligation(protocol, link) {
  if (
    !protocol ||
    !link ||
    String(protocol.id).toLowerCase() !== link.protocolId.toLowerCase()
  ) {
    return null;
  }

  const matches = (protocol.participants || []).filter(
    participant =>
      String(participant.enrollment_id).toLowerCase() ===
      link.enrollmentId.toLowerCase()
  );

  if (matches.length !== 1) return null;

  const obligationId = String(matches[0].obligation_id || "");

  if (!UUID.test(obligationId)) return null;

  return {
    obligationId,
    learnerName: matches[0].learner_name || link.enrollmentId,
  };
}
