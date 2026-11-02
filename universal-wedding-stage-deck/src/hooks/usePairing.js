import { useCallback, useState } from 'react';
import { clearPairing, loadPairing, normalizePin, savePairing } from '../lib/pairing';

// Gate that keeps the stage deck locked behind the wedding cartridge's
// 4-digit room PIN. Verification happens locally, so pairing works offline;
// the PIN doubles as the Supabase Realtime room key once paired.
export function usePairing({ expectedPin }) {
  const [pairing, setPairing] = useState(() => loadPairing());
  const pin = pairing && pairing.pin === expectedPin ? pairing.pin : null;

  const pair = useCallback(
    (rawPin) => {
      const candidate = normalizePin(String(rawPin ?? ''));
      if (!candidate) {
        return { ok: false, error: 'Enter the 4-digit room PIN.' };
      }
      if (candidate !== expectedPin) {
        return { ok: false, error: 'Incorrect PIN for this wedding cartridge.' };
      }

      const record = { pin: candidate, pairedAt: new Date().toISOString() };
      savePairing(record);
      setPairing(record);
      return { ok: true };
    },
    [expectedPin],
  );

  const unpair = useCallback(() => {
    clearPairing();
    setPairing(null);
  }, []);

  return {
    pin,
    isPaired: Boolean(pin),
    pair,
    unpair,
  };
}
