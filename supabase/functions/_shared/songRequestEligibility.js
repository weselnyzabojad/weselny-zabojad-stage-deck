// Public Song Requestor eligibility (issue #886).
//
// A wedding exposes the guest song-request page only when the Doc package is
// HOST_AND_DJ_VIP or DJ_MC AND the assigned DJ is Mark or Szymoniak. The guest
// page/code is never a role and never gets a PIN.
import { isVipWedding } from './vipRules.js';

export const SONG_REQUESTS_UNAVAILABLE = 'song_requests_unavailable';

export function songRequestEligible(cartridge) {
  return isVipWedding(cartridge);
}
