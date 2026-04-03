/**
 * ISO 3166-1 alpha-2 → Country name mapping
 * Used across the app to display human-readable country names
 */
export const COUNTRY_NAMES: Record<string, string> = {
  AE: "UAE", AF: "Afghanistan", AL: "Albania", AM: "Armenia", AT: "Austria",
  AU: "Australia", AZ: "Azerbaijan", BD: "Bangladesh", BE: "Belgium",
  BF: "Burkina Faso", BG: "Bulgaria", BR: "Brazil", BW: "Botswana",
  CA: "Canada", CF: "Central African Rep.", CH: "Switzerland", CM: "Cameroon",
  CN: "China", CO: "Colombia", CZ: "Czechia", DE: "Germany", DK: "Denmark",
  EC: "Ecuador", EE: "Estonia", EG: "Egypt", ES: "Spain", ET: "Ethiopia",
  FI: "Finland", FJ: "Fiji", FR: "France", GA: "Gabon", GB: "United Kingdom",
  GH: "Ghana", GR: "Greece", GT: "Guatemala", HK: "Hong Kong", HN: "Honduras",
  HR: "Croatia", HU: "Hungary", ID: "Indonesia", IE: "Ireland", IL: "Israel",
  IN: "India", IR: "Iran", IS: "Iceland", IT: "Italy", JM: "Jamaica",
  JO: "Jordan", JP: "Japan", KE: "Kenya", KR: "South Korea", KZ: "Kazakhstan",
  LK: "Sri Lanka", LT: "Lithuania", LV: "Latvia", MA: "Morocco", MD: "Moldova",
  MG: "Madagascar", ML: "Mali", MM: "Myanmar", MN: "Mongolia", MW: "Malawi",
  MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NG: "Nigeria", NL: "Netherlands",
  NO: "Norway", NP: "Nepal", NZ: "New Zealand", PE: "Peru", PG: "Papua New Guinea",
  PH: "Philippines", PK: "Pakistan", PL: "Poland", PT: "Portugal", RO: "Romania",
  RS: "Serbia", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SE: "Sweden",
  SG: "Singapore", SI: "Slovenia", SK: "Slovakia", SN: "Senegal", SV: "El Salvador",
  TH: "Thailand", TN: "Tunisia", TR: "Turkey", TW: "Taiwan", TZ: "Tanzania",
  UA: "Ukraine", UG: "Uganda", US: "United States", UZ: "Uzbekistan",
  VE: "Venezuela", VN: "Vietnam", ZA: "South Africa", ZM: "Zambia", ZW: "Zimbabwe",
};

/** Convert ISO code to display name, fallback to code if not found */
export function countryName(iso: string): string {
  return COUNTRY_NAMES[iso] ?? iso;
}
