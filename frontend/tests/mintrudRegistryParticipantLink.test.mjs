import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMintrudParticipantLink,
  resolveMintrudParticipantObligation,
} from "../src/lib/mintrudRegistryParticipantLink.js";

const protocolId = "723618e8-a2c6-4852-a5f3-f579d99a9343";
const enrollmentId = "e690f4d3-3107-4c8a-8a36-983fb239f086";
const obligationId = "2b3f66ac-7b94-4206-b140-86f55890b215";

test("valid deep link identifies protocol and enrollment", () => {
  const hash = `#participant=${protocolId}:${enrollmentId}`;

  assert.deepEqual(
    parseMintrudParticipantLink(hash),
    { protocolId, enrollmentId },
  );
});

test("invalid deep links are rejected", () => {
  for (const hash of [
    "",
    "#overview",
    "#participant=bad:bad",
    "#participant=%ZZ:bad",
    `#participant=${protocolId}:${enrollmentId}:extra`,
  ]) {
    assert.equal(parseMintrudParticipantLink(hash), null);
  }
});

test("participant maps to a precise persisted obligation", () => {
  const link = { protocolId, enrollmentId };
  const protocol = {
    id: protocolId,
    participants: [
      {
        enrollment_id: enrollmentId,
        obligation_id: obligationId,
        learner_name: "Тестовый участник",
      },
    ],
  };

  assert.deepEqual(
    resolveMintrudParticipantObligation(protocol, link),
    {
      obligationId,
      learnerName: "Тестовый участник",
    }
  );

  assert.equal(
    resolveMintrudParticipantObligation(
      { ...protocol, participants: [] },
      link
    ),
    null
  );

  assert.equal(
    resolveMintrudParticipantObligation(
      { ...protocol, participants: [protocol.participants[0], protocol.participants[0]] },
      link
    ),
    null
  );
});

test("missing obligation is never inferred", () => {
  const link = { protocolId, enrollmentId };

  assert.equal(
    resolveMintrudParticipantObligation({
      id: protocolId,
      participants: [{
        enrollment_id: enrollmentId,
        obligation_id: null,
      }],
    }, link),
    null
  );
});
