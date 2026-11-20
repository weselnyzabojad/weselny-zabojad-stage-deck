import { useCallback, useState } from 'react';
import {
  loadPairing,
  normalizePin,
  pairingMatches,
  savePairing,
} from '../lib/pairing';

// Local gate for the legacy/demo DDMM PIN. Verification happens in the browser
// and only unlocks the UI; the cloud room is keyed by `weddingId`, not the PIN.
// The stored pairing is bound to the active cartridge's `weddingId`.
export function usePairing({ expectedPin, weddingId }) {
  const [pairing, setPairing] = useState(() => loadPairing());
  const matches = pairingMatches(pairing, { pin: expectedPin, weddingId });
  const pin = matches ? pairing.pin : null;

  const pair = useCallback(
    (rawPin) => {
      const candidate = normalizePin(String(rawPin ?? ''));
      if (!candidate) {
        return { ok: false, error: 'Enter the 4-digit room PIN.' };
      }
      if (candidate !== expectedPin) {
        return { ok: false, error: 'Incorrect PIN for this wedding cartridge.' };
      }

      const record = { pin: candidate, weddingId, pairedAt: new Date().toISOString() };
      savePairing(record);
      setPairing(record);
      return { ok: true };
    },
    [expectedPin, weddingId],
  );

  return {
    pin,
    isPaired: Boolean(pin),
    pair,
  };
}
