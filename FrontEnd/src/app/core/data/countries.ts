/**
 * Countries a vendor can be based in, stored as ISO 3166-1 alpha-2 codes
 * (SA, CN, IN, EG…) so staff can filter vendors by country. Names come from
 * the browser's Intl.DisplayNames in Arabic or English, so no name table is
 * kept here.
 *
 * The countries MSP sources from most are pinned to the top of the list;
 * the rest follow alphabetically in the reader's language.
 */
export const PINNED_COUNTRIES = ['SA', 'AE', 'EG', 'CN', 'IN', 'TR', 'JO', 'KW', 'BH', 'QA', 'OM'];

const ALL_CODES = (
  'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD ' +
  'CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ ' +
  'IE IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA ' +
  'NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA ' +
  'SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW'
).split(' ');

const namesCache = new Map<string, Intl.DisplayNames>();

/** The country's name in Arabic or English; falls back to the code itself. */
export function countryName(code: string | null | undefined, lang: 'ar' | 'en'): string {
  if (!code) return '';
  let names = namesCache.get(lang);
  if (!names) {
    names = new Intl.DisplayNames([lang], { type: 'region' });
    namesCache.set(lang, names);
  }
  return names.of(code) ?? code;
}

/** Options for a country <select>: pinned countries first, then the rest by name. */
export function countryOptions(lang: 'ar' | 'en'): { code: string; name: string }[] {
  const pinned = PINNED_COUNTRIES.map((code) => ({ code, name: countryName(code, lang) }));
  const rest = ALL_CODES.filter((c) => !PINNED_COUNTRIES.includes(c))
    .map((code) => ({ code, name: countryName(code, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));
  return [...pinned, ...rest];
}
