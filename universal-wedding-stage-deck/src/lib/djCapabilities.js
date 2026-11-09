// Single source of truth for DJ Standard/VIP UI capabilities.
//
// Standard (laptop-only) may see role identity, clock, Sync, language, theme,
// read-only timeline/projected timing/cutoff, set notes and standard song data.
// VIP additionally gets guest requests, Disco Polo, cultural/speeches chips,
// Music Policy, booth cues, VIP auth/PIN and Open on Phone.
export function djCapabilities(tier) {
  const vip = tier === 'vip' || tier === 'VIP';
  return {
    tier: vip ? 'vip' : 'standard',
    vip,
    pocket: vip,
    musicPolicy: vip,
    culturalChips: vip,
    speeches: vip,
    guestRequests: vip,
    discoPolo: vip,
    boothCues: vip,
    vipAuth: vip,
    openOnPhone: vip,
    coupleLanguages: vip,
    devSimulator: vip,
  };
}
