// Shared VIP rules (issues #879/#886). Only DJ Mark and DJ Szymoniak carry the
// VIP tier; VIP packages are the DJ VIP package and DJ_MC.
export const VIP_PACKAGES = new Set(['HOST_AND_DJ_VIP', 'DJ_MC']);
// Seed fallback; the database registry is authoritative for admin mutations.
export const VIP_DJ_IDS = new Set(['dj_mark', 'dj_szymoniak']);

export function isVipPackage(servicePackage) {
  return VIP_PACKAGES.has(servicePackage);
}

export function isVipDjId(id) {
  // The database registry/FK is authoritative; any assigned identity on a VIP
  // package is treated as a registered VIP DJ.
  return typeof id === 'string' && id.trim().length > 0;
}

export function isVipWedding(cartridge) {
  const servicePackage = cartridge?.servicePackage;
  const djIdentityId = cartridge?.djIdentityId ?? cartridge?.dj?.identityId ?? null;
  return isVipPackage(servicePackage) && isVipDjId(djIdentityId);
}
