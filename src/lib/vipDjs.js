// Seed/fallback VIP DJ registry. The live registry is stored in `vip_djs` and
// fetched by admin/landing; these records keep local/demo mode usable offline.
export const VIP_DJS = [
  {
    id: 'dj_mark',
    displayName: 'DJ Mark',
    phone: 'TODO_OWNER_PHONE',
    instagram: 'TODO_OWNER_INSTAGRAM',
    tier: 'VIP',
    defaultForPackage: 'HOST_AND_DJ_VIP',
  },
  {
    id: 'dj_szymoniak',
    displayName: 'DJ Szymoniak',
    phone: 'TODO_OWNER_PHONE',
    instagram: 'TODO_OWNER_INSTAGRAM',
    tier: 'VIP',
    defaultForPackage: null,
  },
];

const VIP_IDS = new Set(VIP_DJS.map((dj) => dj.id));

export function isVipDjId(id) {
  return typeof id === 'string' && VIP_IDS.has(id);
}

export function vipDjById(id) {
  return VIP_DJS.find((dj) => dj.id === id) ?? null;
}

// Only the VIP/MC+DJ package defaults to DJ Mark. A Standard package stays
// Standard unless the admin explicitly assigns a VIP DJ.
export function defaultVipDjId(servicePackage) {
  return servicePackage === 'HOST_AND_DJ_VIP' ? 'dj_mark' : null;
}
