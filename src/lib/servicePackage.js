// Allowed service packages. The cartridge schema is canonical; this module
// keeps the client-side selector and validation in sync with it.
export const SERVICE_PACKAGES = Object.freeze([
  'HOST_ONLY',
  'DJ_MC',
  'HOST_AND_DJ_VIP',
]);

export function isServicePackage(value) {
  return SERVICE_PACKAGES.includes(value);
}
