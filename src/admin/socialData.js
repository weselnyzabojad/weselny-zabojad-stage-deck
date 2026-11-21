// Issue #1338: normalize the owner-admin Social Studio payload.
import { buildWeddingRecap } from '../lib/weddingRecap.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeSocialData({ row = null, source = null, vipDjs = [] } = {}) {
  const cartridge =
    source?.wedding && typeof source.wedding === 'object' && !Array.isArray(source.wedding)
      ? source.wedding
      : row?.cartridge ?? {};
  const liveState = source?.liveState ?? null;
  const requests = asArray(source?.songRequests);
  const djIdentityId =
    cartridge?.djIdentityId ?? cartridge?.dj?.identityId ?? row?.djIdentityId ?? null;
  const vipDj =
    asArray(vipDjs).find((entry) => entry?.id === djIdentityId) ??
    asArray(vipDjs).find((entry) => entry?.id === row?.djIdentityId) ??
    null;
  const languages = asArray(
    cartridge?.extensions?.languages?.supported ?? row?.languages,
  )
    .map((code) => String(code).toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
  const roles = asArray(row?.roles);
  const servicePackage =
    cartridge?.servicePackage ?? row?.servicePackage ?? row?.package ?? null;
  const wedding = {
    ...(row ?? {}),
    cartridge,
    roles,
    languages,
    servicePackage,
    djIdentityId,
    vipDjName: vipDj?.display_name ?? vipDj?.displayName ?? null,
  };
  let recap = null;
  try {
    recap = buildWeddingRecap({
      wedding: cartridge,
      liveState: liveState ?? {},
      songRequests: requests,
    });
  } catch {
    recap = null;
  }
  return {
    wedding,
    cartridge,
    liveState,
    recap,
    requests,
    roles,
    languages,
    servicePackage,
    djIdentityId,
    vipDjName: wedding.vipDjName,
  };
}
