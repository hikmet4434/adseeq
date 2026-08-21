export const AD_COUNTRIES = [
  ["ALL", "Tüm ülkeler"],
  ["TR", "Türkiye"],
  ["US", "Amerika Birleşik Devletleri"],
  ["GB", "Birleşik Krallık"],
  ["DE", "Almanya"],
  ["FR", "Fransa"],
  ["IT", "İtalya"],
  ["ES", "İspanya"],
  ["NL", "Hollanda"],
  ["CA", "Kanada"],
  ["AU", "Avustralya"],
  ["AE", "Birleşik Arap Emirlikleri"],
  ["SA", "Suudi Arabistan"],
  ["IN", "Hindistan"],
  ["BR", "Brezilya"]
] as const;

export const AD_COUNTRY_CODES: ReadonlySet<string> = new Set(AD_COUNTRIES.map(([code]) => code));
