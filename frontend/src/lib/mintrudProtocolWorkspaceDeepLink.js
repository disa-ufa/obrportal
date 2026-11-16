import { parseMintrudParticipantLink } from './mintrudRegistryParticipantLink.js';

const normalize = value =>
  typeof value === 'string' ? value.toLowerCase() : '';

export function resolveMintrudWorkspaceParticipant(protocolId, hash, composition) {
  let link = null;

  try {
    link = parseMintrudParticipantLink(hash);
  } catch {
    return null;
  }

  if (!link) return null;

  if (
    normalize(link.protocolId) !== normalize(protocolId) ||
    normalize(composition?.protocol?.id) !== normalize(protocolId) ||
    composition?.complete !== true ||
    composition?.read_only !== true ||
    !Array.isArray(composition?.members) ||
    composition.members.length !== composition.participant_count
  ) {
    return null;
  }

  const matches = composition.members.filter(
    member => normalize(member?.enrollment_id) === normalize(link.enrollmentId)
  );

  if (matches.length !== 1) return null;

  const member = matches[0];

  if (![member.member_id, member.enrollment_id, member.obligation_id, member.user_id]
    .every(value => typeof value === 'string' && value.trim())) {
    return null;
  }

  const sameObligation = composition.members.filter(
    row => normalize(row?.obligation_id) === normalize(member.obligation_id)
  );

  if (sameObligation.length !== 1) return null;

  return member;
}
