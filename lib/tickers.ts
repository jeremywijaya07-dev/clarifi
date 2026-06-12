export interface TickerInfo {
  symbol: string;
  name: string;
  exchange: 'US' | 'IDX';
}

export const TICKERS: TickerInfo[] = [
  // US Trending
  { symbol: 'AAPL',  name: 'Apple Inc.',                        exchange: 'US'  },
  { symbol: 'NVDA',  name: 'Nvidia Corporation',                exchange: 'US'  },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',             exchange: 'US'  },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                        exchange: 'US'  },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',                     exchange: 'US'  },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',                   exchange: 'US'  },
  { symbol: 'META',  name: 'Meta Platforms',                    exchange: 'US'  },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',            exchange: 'US'  },
  { symbol: 'PLTR',  name: 'Palantir Technologies',             exchange: 'US'  },
  { symbol: 'ARM',   name: 'Arm Holdings',                      exchange: 'US'  },
  // IDX Banking
  { symbol: 'BBCA',  name: 'Bank Central Asia',                 exchange: 'IDX' },
  { symbol: 'BBRI',  name: 'Bank Rakyat Indonesia',             exchange: 'IDX' },
  { symbol: 'BMRI',  name: 'Bank Mandiri',                      exchange: 'IDX' },
  { symbol: 'BBNI',  name: 'Bank Negara Indonesia',             exchange: 'IDX' },
  { symbol: 'BRIS',  name: 'Bank Syariah Indonesia',            exchange: 'IDX' },
  { symbol: 'NISP',  name: 'Bank OCBC NISP',                    exchange: 'IDX' },
  { symbol: 'BNGA',  name: 'Bank CIMB Niaga',                   exchange: 'IDX' },
  { symbol: 'MAYA',  name: 'Bank Mayapada Internasional',       exchange: 'IDX' },
  // IDX Energy / Mining
  { symbol: 'BREN',  name: 'Barito Renewables Energy',          exchange: 'IDX' },
  { symbol: 'ADRO',  name: 'Adaro Energy Indonesia',            exchange: 'IDX' },
  { symbol: 'PTBA',  name: 'Bukit Asam',                        exchange: 'IDX' },
  { symbol: 'ITMG',  name: 'Indo Tambangraya Megah',            exchange: 'IDX' },
  { symbol: 'ANTM',  name: 'Aneka Tambang',                     exchange: 'IDX' },
  { symbol: 'AMMN',  name: 'Amman Mineral Internasional',       exchange: 'IDX' },
  { symbol: 'MDKA',  name: 'Merdeka Copper Gold',               exchange: 'IDX' },
  { symbol: 'INCO',  name: 'Vale Indonesia',                    exchange: 'IDX' },
  { symbol: 'HRUM',  name: 'Harum Energy',                      exchange: 'IDX' },
  // IDX Tech / Telecom
  { symbol: 'GOTO',  name: 'GoTo Gojek Tokopedia',              exchange: 'IDX' },
  { symbol: 'BUKA',  name: 'Bukalapak.com',                     exchange: 'IDX' },
  { symbol: 'EMTK',  name: 'Elang Mahkota Teknologi',           exchange: 'IDX' },
  { symbol: 'DCII',  name: 'DCI Indonesia',                     exchange: 'IDX' },
  { symbol: 'TLKM',  name: 'Telkom Indonesia',                  exchange: 'IDX' },
  { symbol: 'EXCL',  name: 'XL Axiata',                         exchange: 'IDX' },
  { symbol: 'ISAT',  name: 'Indosat Ooredoo Hutchison',         exchange: 'IDX' },
  // IDX Consumer / Healthcare
  { symbol: 'UNVR',  name: 'Unilever Indonesia',                exchange: 'IDX' },
  { symbol: 'ICBP',  name: 'Indofood CBP Sukses Makmur',        exchange: 'IDX' },
  { symbol: 'INDF',  name: 'Indofood Sukses Makmur',            exchange: 'IDX' },
  { symbol: 'MYOR',  name: 'Mayora Indah',                      exchange: 'IDX' },
  { symbol: 'KLBF',  name: 'Kalbe Farma',                       exchange: 'IDX' },
  { symbol: 'MIKA',  name: 'Mitra Keluarga Karyasehat',         exchange: 'IDX' },
  { symbol: 'HEAL',  name: 'Medikaloka Hermina',                exchange: 'IDX' },
  { symbol: 'SIDO',  name: 'Sido Muncul',                       exchange: 'IDX' },
  // IDX Konglomerat / Industrial
  { symbol: 'ASII',  name: 'Astra International',               exchange: 'IDX' },
  { symbol: 'TPIA',  name: 'Chandra Asri Pacific',              exchange: 'IDX' },
  { symbol: 'BRPT',  name: 'Barito Pacific',                    exchange: 'IDX' },
  { symbol: 'INKP',  name: 'Indah Kiat Pulp & Paper',           exchange: 'IDX' },
  { symbol: 'TKIM',  name: 'Pabrik Kertas Tjiwi Kimia',         exchange: 'IDX' },
  { symbol: 'MNCN',  name: 'Media Nusantara Citra',             exchange: 'IDX' },
  { symbol: 'LPKR',  name: 'Lippo Karawaci',                    exchange: 'IDX' },
  { symbol: 'MAPI',  name: 'Mitra Adiperkasa',                  exchange: 'IDX' },
  { symbol: 'PTRO',  name: 'Petrosea',                          exchange: 'IDX' },
  // IDX Property
  { symbol: 'BSDE',  name: 'Bumi Serpong Damai',                exchange: 'IDX' },
  { symbol: 'SMRA',  name: 'Summarecon Agung',                  exchange: 'IDX' },
  { symbol: 'CTRA',  name: 'Ciputra Development',               exchange: 'IDX' },
  { symbol: 'PWON',  name: 'Pakuwon Jati',                      exchange: 'IDX' },
  { symbol: 'JSMR',  name: 'Jasa Marga',                        exchange: 'IDX' },
];

export function searchTickers(query: string, limit = 8): TickerInfo[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return TICKERS
    .filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    .slice(0, limit);
}
