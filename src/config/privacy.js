// Privacy/encryption defaults and normalisation. Kept outside the wedding
// content parser so runtime config can be swapped without touching the Doc
// mapping (#698).

export const PRIVACY_CONFIG = Object.freeze({
  cloudSync: 'ENCRYPTED_HOST_KEY',
  encryption: Object.freeze({
    alg: 'AES-GCM',
    keyHolder: 'HOST',
    version: 1,
  }),
});

export function normalizePrivacy(raw = {}) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const encryption =
    input.encryption && typeof input.encryption === 'object' ? input.encryption : {};
  return {
    cloudSync: input.cloudSync ?? PRIVACY_CONFIG.cloudSync,
    encryption: {
      alg: encryption.alg ?? PRIVACY_CONFIG.encryption.alg,
      keyHolder: encryption.keyHolder ?? PRIVACY_CONFIG.encryption.keyHolder,
      version: Number.isInteger(encryption.version)
        ? encryption.version
        : PRIVACY_CONFIG.encryption.version,
    },
  };
}
