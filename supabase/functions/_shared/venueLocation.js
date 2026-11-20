// Venue location helpers (issue #1212).
//
// The admin may enter an explicit ISO 3166-1 alpha-2 country. Without one, only
// a deterministic city or postal-code lookup for PL/FR/BE is allowed; anything
// else stays null rather than guessing from the couple or language.

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

function normaliseText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

function isRecognisedRegion(code) {
  if (!regionNames) return true;
  try {
    const label = regionNames.of(code);
    return Boolean(label) && label !== code && !/unknown/i.test(label);
  } catch {
    return false;
  }
}

export function normalizeCountry(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return isRecognisedRegion(code) ? code : null;
}

const CITY_COUNTRY = new Map();

function addCities(country, cities) {
  for (const city of cities) CITY_COUNTRY.set(normaliseText(city), country);
}

addCities('PL', [
  'Warszawa',
  'Warsaw',
  'Kraków',
  'Krakow',
  'Wrocław',
  'Wroclaw',
  'Poznań',
  'Poznan',
  'Gdańsk',
  'Gdansk',
  'Łódź',
  'Lodz',
  'Katowice',
  'Lublin',
  'Szczecin',
  'Bydgoszcz',
  'Białystok',
  'Bialystok',
  'Toruń',
  'Torun',
  'Rzeszów',
  'Rzeszow',
  'Kielce',
  'Olsztyn',
  'Częstochowa',
  'Czestochowa',
  'Zakopane',
  'Sopot',
  'Gdynia',
]);

addCities('FR', [
  'Paris',
  'Lyon',
  'Marseille',
  'Bordeaux',
  'Toulouse',
  'Nice',
  'Nantes',
  'Strasbourg',
  'Lille',
  'Montpellier',
  'Rennes',
  'Reims',
  'Toulon',
  'Saint-Étienne',
  'Saint-Etienne',
  'Le Havre',
  'Grenoble',
  'Dijon',
  'Angers',
  'Nîmes',
  'Nimes',
  'Avignon',
  'Cannes',
  'Biarritz',
  'Versailles',
]);

addCities('BE', [
  'Brussels',
  'Bruxelles',
  'Brussel',
  'Antwerp',
  'Antwerpen',
  'Anvers',
  'Ghent',
  'Gent',
  'Gand',
  'Bruges',
  'Brugge',
  'Liège',
  'Liege',
  'Luik',
  'Namur',
  'Leuven',
  'Louvain',
  'Charleroi',
  'Mons',
  'Aalst',
  'Mechelen',
  'Malines',
  'Kortrijk',
  'Courtrai',
  'Ostend',
  'Oostende',
  'Hasselt',
]);

function countryFromPostal(postalCode) {
  const postal = String(postalCode ?? '').trim();
  if (/^\d{2}-\d{3}$/.test(postal)) return 'PL';
  if (/^\d{4}$/.test(postal)) return 'BE';
  if (/^\d{5}$/.test(postal)) return 'FR';
  return null;
}

export function resolveVenueCountry({ country = null, city = null, address = null } = {}) {
  const explicit = normalizeCountry(country);
  if (explicit) return explicit;

  const fromCity = CITY_COUNTRY.get(normaliseText(city));
  if (fromCity) return fromCity;

  const addressText = String(address ?? '');
  const postalMatch = addressText.match(/\b(\d{2}-\d{3}|\d{4,5})\b/);
  if (postalMatch) {
    const fromAddress = countryFromPostal(postalMatch[1]);
    if (fromAddress) return fromAddress;
  }

  return null;
}

export { countryFromPostal };
