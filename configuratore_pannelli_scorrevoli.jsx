import React, { useMemo, useState } from "react";
import { Check, ChevronRight, ChevronLeft, LayoutPanelLeft, Ruler, Palette, KeyRound, FileText, Settings2 } from "lucide-react";

// ---------------------------------------------------------------------------
// DATI DI PRODOTTO — Listino Albed V1.8 2025, categoria "Pannelli scorrevoli o
// girevoli" (p.236), modello QUADRA (p.250), sistema binario Evo (p.238-239).
// Regole di business confermate dall'utente sul preventivo reale:
//  - ricarico fisso +6% su TUTTI i prezzi di listino
//  - lunghezza binario: 1× larghezza vano se applicazione "a soffitto"
//                        2× larghezza vano se "a parete" o "a parete e soffitto"
//                        (vale per 1/2/3 vie in entrambi i casi)
//  - "coppia tappi di chiusura" si aggiunge solo nelle configurazioni a parete
//  - "profilo di battuta" resta specifico delle configurazioni a soffitto
// ---------------------------------------------------------------------------

const MARKUP = 1.06; // ricarico confermato su tutti i prezzi di listino

const WIDTH_BANDS = [
  { id: "w1", label: "500–700", min: 500, max: 700, code: "50-70" },
  { id: "w2", label: "700–900", min: 700, max: 900, code: "70-90" },
  { id: "w3", label: "900–1100", min: 900, max: 1100, code: "90-110" },
  { id: "w4", label: "1100–1300", min: 1100, max: 1300, code: "110-130" },
  { id: "w5", label: "1300–1500", min: 1300, max: 1500, code: "130-150" },
];

const HEIGHT_BANDS = [
  { id: "h1", label: "< 2100", min: 0, max: 2100, code: "0-210" },
  { id: "h2", label: "2100–2300", min: 2100, max: 2300, code: "210-230" },
  { id: "h3", label: "2300–2500", min: 2300, max: 2500, code: "230-250" },
  { id: "h4", label: "2500–2700", min: 2500, max: 2700, code: "250-270" },
  { id: "h5", label: "2700–3000", min: 2700, max: 3000, code: "270-300" },
  { id: "h6", label: "3000–3200", min: 3000, max: 3200, code: "300-320" },
];

// Sail — bande dimensionali proprie (parte da L700, non da L500; solo 4 fasce altezza)
const SAIL_WIDTH_BANDS = [
  { id: "sw1", label: "700–900", min: 700, max: 900, code: "70-90" },
  { id: "sw2", label: "900–1100", min: 900, max: 1100, code: "90-110" },
  { id: "sw3", label: "1100–1300", min: 1100, max: 1300, code: "110-130" },
  { id: "sw4", label: "1300–1500", min: 1300, max: 1500, code: "130-150" },
];

const SAIL_HEIGHT_BANDS = [
  { id: "sh1", label: "< 2100", min: 0, max: 2100, code: "0-210" },
  { id: "sh2", label: "2100–2300", min: 2100, max: 2300, code: "210-230" },
  { id: "sh3", label: "2300–2500", min: 2300, max: 2500, code: "230-250" },
  { id: "sh4", label: "2500–2700", min: 2500, max: 2700, code: "250-270" },
];

// And con binario invisibile — bande dimensionali proprie (solo L700-1300)
const AND_WIDTH_BANDS = [
  { id: "aw1", label: "700–900", min: 700, max: 900, code: "70-90" },
  { id: "aw2", label: "900–1100", min: 900, max: 1100, code: "90-110" },
  { id: "aw3", label: "1100–1300", min: 1100, max: 1300, code: "110-130" },
];

// prezzi[heightBandIndex][widthBandIndex] — vetro singolo Cat.A, finitura alluminio anodizzato (prezzo di listino, senza ricarico)
const QUADRA_SINGLE_GLASS_A = [
  [1147, 1241, 1336, 1429, 1502],
  [1185, 1287, 1388, 1488, 1580],
  [1224, 1332, 1441, 1548, 1631],
  [1262, 1378, 1492, 1579, 1695],
  [1321, 1446, 1557, 1602, 1723],
  [1378, 1443, 1602, 1685, 1801],
];

// doppio vetro, base "vetro opaco Cat.C", finitura alluminio anodizzato — non disponibile oltre H3000, disponibile fino a L1500
const QUADRA_DOUBLE_GLASS_C = [
  [1765, 2032, 2298, 2565, 2832],
  [1857, 2145, 2435, 2723, 3010],
  [1949, 2260, 2571, 2881, 3188],
  [2041, 2373, 2706, 3039, 3367],
  [2178, 2544, 3267, 3276, 3635],
];

// pannello legno, laccato standard, finitura alluminio anodizzato — non disponibile oltre H3000 né oltre L1300
const QUADRA_WOOD_PANEL = [
  [1023, 1155, 1293, 1579, null],
  [1124, 1304, 1467, 1753, null],
  [1314, 1459, 1641, 1929, null],
  [1314, 1459, 1641, 1929, null],
  [1473, 1643, 1791, 2109, null],
];

// pannello cuoio, cuoio rigenerato, finitura alluminio anodizzato — non disponibile oltre H3000 né oltre L1300
const QUADRA_LEATHER_PANEL = [
  [2264, 2403, 2542, 2917, null],
  [2348, 2487, 2626, 3056, null],
  [2708, 2847, 2986, 3195, null],
  [2778, 2917, 3056, 3404, null],
  [2847, 2986, 3126, 3543, null],
];

// Prima — vetro singolo Cat.A, finitura alluminio anodizzato o RAL 9003 (prezzo di listino)
const PRIMA_SINGLE_GLASS_A = [
  [1055, 1132, 1320, 1410, 1473],
  [1098, 1183, 1378, 1473, 1549],
  [1141, 1234, 1420, 1522, 1637],
  [1184, 1285, 1473, 1584, 1677],
  [1250, 1308, 1505, 1623, 1733],
  [1293, 1359, 1579, 1693, 1797],
];

const QUADRA_PANEL_TYPES = [
  {
    id: "vetro-singolo",
    label: "Vetro singolo",
    table: QUADRA_SINGLE_GLASS_A,
    heightRows: 6,
    widthCols: 5,
    baseCode: "QD-A1",
    hasDivisions: true,
    finishes: [
      { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0, 0] },
      { id: "B", label: "Vetro Cat. B", type: "pct", value: [13, 15, 16, 17, 19] },
      { id: "C", label: "Vetro Cat. C", type: "pct", value: [19, 24, 27, 27, 30] },
      { id: "D", label: "Vetro Cat. D", type: "pct", value: [40, 50, 58, 58, 65] },
      { id: "E", label: "Vetro Cat. E", type: "pct", value: [65, 95, 95, 95, 105] },
    ],
  },
  {
    id: "doppio-vetro",
    label: "Doppio vetro",
    table: QUADRA_DOUBLE_GLASS_C,
    heightRows: 5,
    widthCols: 5,
    baseCode: "QD-V2",
    hasDivisions: false,
    finishes: [
      { id: "C", label: "Vetro opaco Cat. C", type: "pct", value: [0, 0, 0, 0, 0] },
      { id: "D", label: "Vetro opaco Cat. D", type: "pct", value: [3, 3, 5, 5, 5] },
      { id: "traslucido", label: "Vetro traslucido", type: "pct", value: [7, 7, 7, 7, 7] },
    ],
  },
  {
    id: "pannello-legno",
    label: "Pannello legno",
    table: QUADRA_WOOD_PANEL,
    heightRows: 5,
    widthCols: 4,
    baseCode: "QD-L1",
    hasDivisions: false,
    finishes: [
      { id: "std", label: "Laccato standard", type: "flat", value: 0 },
      { id: "essenza", label: "Essenza legno", type: "flat", value: 286 },
      { id: "ral", label: "Laccato custom RAL", type: "flat", value: 212 },
    ],
  },
  {
    id: "pannello-cuoio",
    label: "Pannello cuoio",
    table: QUADRA_LEATHER_PANEL,
    heightRows: 5,
    widthCols: 4,
    baseCode: "QD-C05",
    hasDivisions: false,
    finishes: [
      { id: "std", label: "Cuoio rigenerato", type: "pct", value: [0, 0, 0, 0, 0] },
      { id: "cuoio", label: "Cuoio", type: "pct", value: [40, 40, 40, 35, null] },
    ],
  },
];

// Celine — vetro singolo Cat.A, finitura alluminio anodizzato o RAL 9003 (prezzo di listino)
const CELINE_SINGLE_GLASS_A = [
  [1613, 1710, 1805, 1902, 1997],
  [1650, 1754, 1858, 1962, 2066],
  [1689, 1799, 1911, 2021, 2134],
  [1725, 1843, 1962, 2083, 2202],
  [1781, 1911, 2042, 2172, 2268],
  [1850, 1956, 2095, 2232, 2370],
];

// Ri-trait — vetro singolo Cat.A, finitura alluminio anodizzato (prezzo di listino)
const RITRAIT_SINGLE_GLASS_A = [
  [1137, 1261, 1385, 1511, 1635],
  [1187, 1322, 1456, 1591, 1724],
  [1237, 1381, 1526, 1672, 1813],
  [1286, 1442, 1596, 1752, 1902],
  [1360, 1532, 1702, 1873, 2025],
  [1367, 1685, 1791, 1954, 2125],
];

// Sail — vetro Cat.A (prezzo di listino), niente divisioni, niente Cat. D/E
const SAIL_GLASS_A = [
  [689, 763, 843, 917],
  [716, 795, 880, 949],
  [737, 827, 912, 1007],
  [763, 859, 1049, 1092],
];

// Ri-trait 8B — vetro singolo Cat.A, finitura alluminio anodizzato (prezzo di listino)
const RITRAIT8B_GLASS_A = [
  [1789, 2022, 2219, 2427, 2611],
  [1855, 2109, 2321, 2540, 2807],
  [1961, 2214, 2439, 2720, 2911],
  [2003, 2298, 2543, 2857, 3026],
  [2109, 2401, 2639, 2957, 3178],
  [2205, 2502, 2745, 3093, 3275],
];

// And con binario invisibile — pannello legno, laccato standard (prezzo di listino, solo 3 fasce L700-1300, 4 fasce H)
const AND_WOOD_PANEL = [
  [1389, 1531, 1569],
  [1441, 1569, 1633],
  [1505, 1627, 1672],
  [1621, 1756, 1788],
];

// Dot — vetro singolo Cat.A, finitura alluminio anodizzato (prezzo di listino)
const DOT_GLASS_A = [
  [864, 965, 1064, 1165, 1265],
  [898, 1007, 1117, 1226, 1337],
  [931, 1050, 1169, 1289, 1408],
  [965, 1093, 1222, 1350, 1480],
  [1014, 1158, 1309, 1444, 1558],
  [982, 1261, 1353, null, null],
];

const COLLECTION_PANEL_TYPES = {
  quadra: QUADRA_PANEL_TYPES,
  prima: [
    {
      id: "vetro-singolo",
      label: "Vetro singolo",
      table: PRIMA_SINGLE_GLASS_A,
      heightRows: 6,
      widthCols: 5,
      baseCode: "PR-A1",
      hasDivisions: true,
      availableDivisionIds: ["intero", "2div", "3div"],
      divisionCodes: { intero: "PR-A1", "2div": "PR-A2", "3div": "PR-A3" },
      finishes: [
        { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0, 0] },
        { id: "B", label: "Vetro Cat. B", type: "pct", value: [13, 15, 16, 17, 19] },
        { id: "C", label: "Vetro Cat. C", type: "pct", value: [19, 24, 27, 27, 30] },
        { id: "D", label: "Vetro Cat. D", type: "pct", value: [40, 50, 58, 58, 65] },
        { id: "E", label: "Vetro Cat. E", type: "pct", value: [65, 95, 95, 95, 105] },
      ],
    },
  ],
  celine: [
    {
      id: "vetro-singolo",
      label: "Vetro singolo",
      table: CELINE_SINGLE_GLASS_A,
      heightRows: 6,
      widthCols: 5,
      baseCode: "CL-A1",
      hasDivisions: false,
      // [1]-[6] indicano solo quale variante/anta usare (stessa tabella prezzi per tutte);
      // [3][4] disponibili solo L500-L1100, [5][6] solo L1100-L1500 — nessun sovrapprezzo
      variants: [
        { id: "v1", code: "CL-A1", label: "Variante 1", min: 500, max: 1500 },
        { id: "v2", code: "CL-A2", label: "Variante 2", min: 500, max: 1500 },
        { id: "v3", code: "CL-A3", label: "Variante 3", min: 500, max: 1100 },
        { id: "v4", code: "CL-A4", label: "Variante 4", min: 500, max: 1100 },
        { id: "v5", code: "CL-A5", label: "Variante 5", min: 1100, max: 1500 },
        { id: "v6", code: "CL-A6", label: "Variante 6", min: 1100, max: 1500 },
      ],
      finishes: [
        { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0, 0] },
        { id: "B", label: "Vetro Cat. B", type: "pct", value: [7, 8, 8, 8, 9] },
        { id: "C", label: "Vetro Cat. C", type: "pct", value: [19, 24, 27, 27, 30] },
        { id: "D", label: "Vetro Cat. D", type: "pct", value: [20, 30, 33, 35, 45] },
        { id: "E", label: "Vetro Cat. E", type: "pct", value: [35, 65, 65, 65, 70] },
      ],
    },
  ],
  ritrait: [
    {
      id: "vetro-singolo",
      label: "Vetro singolo",
      table: RITRAIT_SINGLE_GLASS_A,
      heightRows: 6,
      widthCols: 5,
      baseCode: "TR-A1",
      hasDivisions: true,
      availableDivisionIds: ["intero", "2div", "3div"],
      divisionCodes: { intero: "TR-A1", "2div": "TR-A2", "3div": "TR-A3" },
      finishes: [
        { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0, 0] },
        { id: "B", label: "Vetro Cat. B", type: "pct", value: [10, 10, 10, 10, 10] },
        { id: "C", label: "Vetro Cat. C", type: "pct", value: [20, 20, 28, 28, 28] },
        { id: "D", label: "Vetro Cat. D", type: "pct", value: [30, 30, 40, 40, 45] },
        { id: "E", label: "Vetro Cat. E", type: "pct", value: [65, 95, 95, 95, 105] },
      ],
    },
  ],
  sail: [
    {
      id: "vetro-singolo",
      label: "Vetro",
      table: SAIL_GLASS_A,
      widthBands: SAIL_WIDTH_BANDS,
      heightBands: SAIL_HEIGHT_BANDS,
      heightRows: 4,
      widthCols: 4,
      baseCode: "FL-260",
      hasDivisions: false,
      finishes: [
        { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0] },
        { id: "B", label: "Vetro Cat. B", type: "pct", value: [15, 15, 15, 20] },
        { id: "C", label: "Vetro Cat. C", type: "pct", value: [30, 30, 35, 40] },
      ],
    },
  ],
  ritrait8b: [
    {
      id: "vetro-singolo",
      label: "Vetro",
      table: RITRAIT8B_GLASS_A,
      heightRows: 6,
      widthCols: 5,
      baseCode: "TR-8BV-R",
      hasDivisions: false,
      variants: [
        { id: "verticale", code: "TR-8BV-R", label: "Reno verticale", min: 500, max: 1500 },
        { id: "orizzontale", code: "TR-8BH-R", label: "Reno orizzontale", min: 500, max: 1500 },
      ],
      finishes: [
        { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0, 0] },
        { id: "B", label: "Vetro Cat. B", type: "pct", value: [5, 7, 7, 7, 10] },
        { id: "C", label: "Vetro Cat. C", type: "pct", value: [10, 12, 15, 15, 20] },
        { id: "D", label: "Vetro Cat. D", type: "pct", value: [15, 20, 25, 30, 30] },
      ],
    },
  ],
  and: [
    {
      id: "pannello-legno",
      label: "Pannello legno",
      table: AND_WOOD_PANEL,
      widthBands: AND_WIDTH_BANDS,
      heightRows: 4,
      widthCols: 3,
      baseCode: "AN-L10",
      hasDivisions: false,
      finishes: [
        { id: "std", label: "Laccato standard", type: "flat", value: 0 },
        { id: "ral", label: "Laccato custom RAL", type: "flat", value: 74 },
        { id: "essenza", label: "Essenza legno", type: "flat", value: 138 },
      ],
    },
  ],
  dot: [
    {
      id: "vetro-singolo",
      label: "Vetro singolo",
      table: DOT_GLASS_A,
      heightRows: 6,
      widthCols: 5,
      baseCode: "DT-A1",
      hasDivisions: false,
      finishes: [
        { id: "A", label: "Vetro Cat. A", type: "pct", value: [0, 0, 0, 0, 0] },
        { id: "B", label: "Vetro Cat. B", type: "pct", value: [15, 15, 15, 20, 20] },
        { id: "C", label: "Vetro Cat. C", type: "pct", value: [30, 30, 35, 40, 40] },
      ],
    },
  ],
};

const DIVISIONS = [
  { id: "intero", label: "Vetro intero (nessuna divisione)", delta: 0, code: "QD-A1" },
  { id: "2div", label: "2 divisioni", delta: 64, code: "QD-A2" },
  { id: "3div", label: "3 divisioni", delta: 127, code: "QD-A3" },
  { id: "8div", label: "8 divisioni", delta: 196, code: "QD-A8" },
];

// binari per applicazione (prezzi di listino €/ml, senza ricarico)
const RAIL_BY_APPLICATION = {
  soffitto: [
    { id: "1via", label: "1 via", pricePerMl: 117, code: "EQ-BS1", capCode: "EQ-T1" },
    { id: "2vie", label: "2 vie", pricePerMl: 159, code: "EQ-BS2", capCode: "EQ-T2" },
    { id: "3vie", label: "3 vie", pricePerMl: 276, code: "EQ-BS3", capCode: null },
  ],
  parete: [
    { id: "1via", label: "1 via", pricePerMl: 138, code: "EQ-BP1", capCode: "EQ-T1" },
    { id: "2vie", label: "2 vie", pricePerMl: 191, code: "EQ-BP2", capCode: "EQ-T2" },
  ],
  "parete-soffitto": [
    { id: "1via", label: "1 via", pricePerMl: 138, code: "EQ-BP1", capCode: "EQ-T1" },
    { id: "2vie", label: "2 vie", pricePerMl: 191, code: "EQ-BP2", capCode: "EQ-T2" },
  ],
};

// Sistema binario Uno — alternativo a Evo, solo a soffitto, solo per collezioni compatibili
const UNO_COMPATIBLE_COLLECTIONS = ["prima", "celine", "ritrait", "ritrait8b"];
const UNO_RAIL_CEILING = {
  "1via": { pricePerMl: 95, code: "VT-S1" },
  "2vie": { pricePerMl: 95, code: "VT-S2" },
  "3vie": { pricePerMl: 191, code: "VT-S3" },
};

const CAP_PRICE = 85; // "coppia tappi di chiusura", automatica nelle config. a parete, prezzo di listino

// Sail — binario dedicato, solo a parete, 1 via, prezzo/ml e codice propri
const SAIL_RAIL = { pricePerMl: 74, code: "FL-450" };

// "trave da incasso per binario Evo a soffitto" — opzionale, per applicazioni a soffitto e a parete-soffitto
const BUILTIN_BEAM_BY_VIA = {
  "1via": { pricePerMl: 58, code: "EQ-TB10" },
  "2vie": { pricePerMl: 64, code: "EQ-TB20" },
  "3vie": { pricePerMl: 138, code: "EQ-TB30" },
};

// "profilo di battuta" — opzionale, disponibile sia a soffitto che a parete
// perpendicolare al binario (QD-ST1): solo 1 via, sia a soffitto che a parete
// parallelo al binario (QD-SP1/QD-SP2): 1 via o 2 vie, sia a soffitto che a parete
const JAMB_TYPES = [
  { id: "perpendicolare", label: "Perpendicolare al binario", price: 201, codeByVia: { "1via": "QD-ST1" } },
  { id: "parallelo", label: "Parallelo al binario", price: 201, codeByVia: { "1via": "QD-SP1", "2vie": "QD-SP2" } },
];

const HANDLES = [
  { id: "loira", label: "Loira", solo: 159, patent: 265, nottolino: 265 },
  { id: "adige100", label: "Adige 100mm", solo: 106, patent: null, nottolino: null },
  { id: "adige300", label: "Adige 300mm", solo: 212, patent: null, nottolino: null },
  { id: "piave", label: "Piave", solo: 106, patent: 212, nottolino: 212 },
];

// And con binario invisibile — solo "solo maniglia", nessuna Adige, nessuna serratura
const AND_HANDLES = [
  { id: "piave", label: "Piave", solo: 106, patent: null, nottolino: null },
  { id: "loira-tonda", label: "Loira tonda", solo: 159, patent: null, nottolino: null },
  { id: "loira-quadrata", label: "Loira quadrata", solo: 159, patent: null, nottolino: null },
];

// Sail — maniglie specifiche di collezione (p.263), tutte "solo maniglia"
const SAIL_HANDLES = [
  { id: "reno1000", label: "Reno 1000mm", solo: 106, patent: null, nottolino: null },
  { id: "reno1600", label: "Reno 1600mm", solo: 159, patent: null, nottolino: null },
  { id: "ticino400", label: "Ticino 400mm", solo: 106, patent: null, nottolino: null },
  { id: "ticino1600", label: "Ticino 1600mm", solo: 159, patent: null, nottolino: null },
  { id: "arno600", label: "Arno 600mm", solo: 159, patent: null, nottolino: null },
  { id: "arno1600", label: "Arno 1600mm", solo: 265, patent: null, nottolino: null },
  { id: "tevere", label: "Tevere", solo: 159, patent: null, nottolino: null },
];

// Ri-trait — maniglie per tipo pannello (vetro vs legno), scorrevole
const RITRAIT_HANDLES_VETRO = [
  { id: "piave", label: "Piave", solo: 106, patent: 212, nottolino: 212 },
  { id: "triennale", label: "Triennale", solo: 106, patent: null, nottolino: null },
];
const RITRAIT_HANDLES = {
  "vetro-singolo": RITRAIT_HANDLES_VETRO,
};

const HANDLES_BY_COLLECTION = {
  and: AND_HANDLES,
  sail: SAIL_HANDLES,
  ritrait: RITRAIT_HANDLES,
};

const LOCK_TYPES = [
  { id: "solo", label: "Solo maniglia" },
  { id: "patent", label: "Chiave Patent" },
  { id: "nottolino", label: "Nottolino" },
];

const APPLICAZIONI = [
  { id: "soffitto", label: "A soffitto" },
  { id: "parete", label: "A parete" },
  { id: "parete-soffitto", label: "A parete e a soffitto" },
];

const COLLECTIONS = [
  { id: "quadra", label: "Quadra", available: true },
  { id: "prima", label: "Prima", available: true },
  { id: "celine", label: "Celine", available: true },
  { id: "ritrait", label: "Ri-trait", available: true },
  { id: "ritrait8b", label: "Ri-trait 8B", available: true },
  { id: "and", label: "And", available: true },
  { id: "sail", label: "Sail", available: true },
  { id: "dot", label: "Dot", available: true },
];

const STEPS = [
  { id: 0, label: "Collezione", icon: LayoutPanelLeft },
  { id: 1, label: "Binario", icon: Settings2 },
  { id: 2, label: "Ante", icon: LayoutPanelLeft },
  { id: 3, label: "Dimensioni", icon: Ruler },
  { id: 4, label: "Pannello", icon: Palette },
  { id: 5, label: "Maniglia", icon: KeyRound },
  { id: 6, label: "Preventivo", icon: FileText },
];

function euro(n) {
  return Math.round(n).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function findBandIndex(bands, value) {
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (value <= b.max && (value > b.min || i === 0)) return i;
  }
  return bands.length - 1;
}

export default function Configuratore() {
  const [step, setStep] = useState(0);
  const [collectionId, setCollectionId] = useState("quadra");

  // Step 1 — binario
  const [applicazione, setApplicazione] = useState("soffitto");
  const [railTypeId, setRailTypeId] = useState("2vie");
  const [railSystem, setRailSystem] = useState("evo");

  // Step 2 — ante
  const [numAnte, setNumAnte] = useState(2);
  const [profiloBattuta, setProfiloBattuta] = useState(false);
  const [jambTypeId, setJambTypeId] = useState("perpendicolare");
  const [travaIncasso, setTravaIncasso] = useState(false);

  // Step 3 — dimensioni vano (mm)
  const [larghezza, setLarghezza] = useState(1300);
  const [altezza, setAltezza] = useState(2400);

  // Step 4 — pannello
  const [panelTypeId, setPanelTypeId] = useState("vetro-singolo");
  const [finishId, setFinishId] = useState("A");
  const [division, setDivision] = useState("intero");
  const [variantId, setVariantId] = useState(null);

  const panelTypesForCollection = COLLECTION_PANEL_TYPES[collectionId] || QUADRA_PANEL_TYPES;
  const handlesEntry = HANDLES_BY_COLLECTION[collectionId] || HANDLES;
  const handlesForCollection = Array.isArray(handlesEntry) ? handlesEntry : handlesEntry[panelTypeId] || HANDLES;
  const panelType = panelTypesForCollection.find((p) => p.id === panelTypeId) || panelTypesForCollection[0];
  const collectionLabel = COLLECTIONS.find((c) => c.id === collectionId)?.label || "Quadra";

  // Step 5 — maniglia
  const [handleId, setHandleId] = useState("adige100");
  const [lockId, setLockId] = useState("solo");

  const railOptionsRaw = RAIL_BY_APPLICATION[applicazione];
  const railOptions = collectionId === "sail" ? railOptionsRaw.filter((r) => r.id !== "3vie") : railOptionsRaw;
  const isWall = applicazione === "parete" || applicazione === "parete-soffitto";

  const breakdown = useMemo(() => {
    const items = [];

    // pannello — larghezza per singola anta (approssimazione: luce vano / numero ante)
    const larghezzaAnta = larghezza / numAnte;

    // And a binario invisibile: il foro di passaggio deve essere più piccolo del pannello massimo
    // disponibile (H: -6cm, L: -11,5cm) — oltre questi limiti la configurazione non è realizzabile
    if (collectionId === "and") {
      const wBandsAnd = panelType.widthBands || WIDTH_BANDS;
      const hBandsAnd = panelType.heightBands || HEIGHT_BANDS;
      const maxPanelWidth = wBandsAnd[panelType.widthCols - 1].max;
      const maxPanelHeight = hBandsAnd[panelType.heightRows - 1].max;
      const maxForoWidth = maxPanelWidth - 115;
      const maxForoHeight = maxPanelHeight - 60;
      if (larghezzaAnta > maxForoWidth || altezza > maxForoHeight) {
        return {
          items: [],
          total: 0,
          wBand: null,
          hBand: null,
          incompatible: true,
          incompatibleReason: `Foro di passaggio troppo grande per And: massimo L ${maxForoWidth}mm x H ${maxForoHeight}mm (il pannello deve superare il foro di 11,5cm in larghezza e 6cm in altezza, e il pannello più grande disponibile è L ${maxPanelWidth}mm x H ${maxPanelHeight}mm).`,
        };
      }
    }

    const wBands = panelType.widthBands || WIDTH_BANDS;
    const hBands = panelType.heightBands || HEIGHT_BANDS;
    let wIdx = findBandIndex(wBands, larghezzaAnta);
    wIdx = Math.min(wIdx, panelType.widthCols - 1);
    let hIdx = findBandIndex(hBands, altezza);
    hIdx = Math.min(hIdx, panelType.heightRows - 1);
    const wBand = wBands[wIdx];
    const hBand = hBands[hIdx];

    let basePanel = panelType.table[hIdx][wIdx];
    if (basePanel == null) {
      // fascia non disponibile per questa combinazione L/H: ripiega sull'ultima fascia larghezza valida della riga
      for (let i = wIdx; i >= 0 && basePanel == null; i--) basePanel = panelType.table[hIdx][i];
    }
    const finish = panelType.finishes.find((f) => f.id === finishId) || panelType.finishes[0];
    const finishExtra =
      finish.type === "pct"
        ? Math.round(basePanel * ((finish.value[wIdx] || 0) / 100))
        : finish.value;
    const div = panelType.hasDivisions
      ? DIVISIONS.find((d) => d.id === division)
      : { id: "intero", label: "", delta: 0, code: panelType.baseCode };
    const divCode = (panelType.divisionCodes && panelType.divisionCodes[div.id]) || div.code;

    // varianti anta senza impatto sul prezzo (es. Celine) — solo per la codifica
    const isUnoActive = railSystem === "uno" && applicazione === "soffitto" && UNO_COMPATIBLE_COLLECTIONS.includes(collectionId);
    let itemCode;
    if (panelType.variants) {
      const validVariants = panelType.variants.filter((v) => wBand.min >= v.min && wBand.max <= v.max);
      const variant = validVariants.find((v) => v.id === variantId) || validVariants[0] || panelType.variants[0];
      itemCode = `${variant.code}${isUnoActive ? "U" : ""}_${wBand.code}x${hBand.code}`;
    } else {
      const base = panelType.hasDivisions ? divCode : panelType.baseCode;
      itemCode = `${base}${isUnoActive ? "U" : ""}_${wBand.code}x${hBand.code}`;
    }

    const panelListPrice = basePanel + finishExtra + div.delta;
    const panelUnitPrice = panelListPrice * MARKUP;

    items.push({
      code: itemCode,
      desc: `${collectionLabel} ${panelType.label} — ${finish.label} (L ${wBand.label} x H ${hBand.label} mm)${
        panelType.hasDivisions && div.id !== "intero" ? `, ${div.label.toLowerCase()}` : ""
      }`,
      qty: numAnte,
      unit: panelUnitPrice,
      total: panelUnitPrice * numAnte,
    });

    // binario — And (a scomparsa, incluso nel prezzo pannello, nessuna voce separata) / Sail (dedicato a parete) / Evo / Uno
    let railLengthM = larghezza / 1000;
    if (collectionId === "and") {
      // il binario a scomparsa è già compreso nel prezzo del pannello: nessuna voce aggiuntiva
    } else if (collectionId === "sail") {
      railLengthM = larghezza / 1000;
      items.push({
        code: SAIL_RAIL.code,
        desc: "Binario Sail a parete (1 via)",
        qty: `${railLengthM.toFixed(1)}`,
        unit: SAIL_RAIL.pricePerMl * MARKUP,
        total: SAIL_RAIL.pricePerMl * railLengthM * MARKUP,
      });
    } else if (isUnoActive) {
      const unoRail = UNO_RAIL_CEILING[railTypeId] || UNO_RAIL_CEILING["2vie"];
      railLengthM = larghezza / 1000;
      items.push({
        code: unoRail.code,
        desc: `Binario Uno a soffitto ${RAIL_BY_APPLICATION.soffitto.find((r) => r.id === railTypeId)?.label || ""}`,
        qty: `${railLengthM.toFixed(1)}`,
        unit: unoRail.pricePerMl * MARKUP,
        total: unoRail.pricePerMl * railLengthM * MARKUP,
      });
    } else {
      const rail = railOptions.find((r) => r.id === railTypeId) || railOptions[0];
      const railMultiplier = isWall ? 2 : 1;
      railLengthM = (larghezza / 1000) * railMultiplier;
      const railListCost = rail.pricePerMl * railLengthM;
      items.push({
        code: rail.code,
        desc: `Binario Evo ${isWall ? "a parete" : "a soffitto"} ${rail.label}`,
        qty: `${railLengthM.toFixed(1)}`,
        unit: rail.pricePerMl * MARKUP,
        total: railListCost * MARKUP,
      });

      const railOffersBeam = !isWall || applicazione === "parete-soffitto";
      if (travaIncasso && railOffersBeam && BUILTIN_BEAM_BY_VIA[railTypeId]) {
        const beam = BUILTIN_BEAM_BY_VIA[railTypeId];
        items.push({
          code: beam.code,
          desc: "Trave da incasso per binario Evo a soffitto",
          qty: `${railLengthM.toFixed(1)}`,
          unit: beam.pricePerMl * MARKUP,
          total: beam.pricePerMl * railLengthM * MARKUP,
        });
      }

      if (isWall && rail.capCode) {
        // coppia tappi di chiusura — automatica nelle configurazioni a parete
        items.push({
          code: rail.capCode,
          desc: "Coppia tappi di chiusura binario Evo",
          qty: 1,
          unit: CAP_PRICE * MARKUP,
          total: CAP_PRICE * MARKUP,
        });
      }

      if (profiloBattuta) {
        // profilo di battuta — opzionale, disponibile sia a soffitto che a parete
        const jambType = JAMB_TYPES.find((j) => j.id === jambTypeId);
        const jambCode = jambType.codeByVia[railTypeId];
        if (jambCode) {
          items.push({
            code: jambCode,
            desc: `Profilo di battuta terminale — ${jambType.label.toLowerCase()}`,
            qty: 1,
            unit: jambType.price * MARKUP,
            total: jambType.price * MARKUP,
          });
        }
      }
    }

    // maniglia — 1 per anta
    const handle = handlesForCollection.find((h) => h.id === handleId) || handlesForCollection[0];
    const lockPrice = handle[lockId];
    if (lockPrice != null) {
      items.push({
        code: handle.label,
        desc: `Maniglia ${handle.label} — ${LOCK_TYPES.find((l) => l.id === lockId).label}`,
        qty: numAnte,
        unit: lockPrice * MARKUP,
        total: lockPrice * MARKUP * numAnte,
      });
    }

    const total = items.reduce((sum, i) => sum + i.total, 0);
    return { items, total, wBand, hBand };
  }, [larghezza, altezza, numAnte, panelTypeId, finishId, division, variantId, railTypeId, railSystem, applicazione, profiloBattuta, jambTypeId, travaIncasso, handleId, lockId, railOptions, isWall, panelType, collectionId]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div
      style={{
        fontFamily: "'Barlow', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#F6F4EF",
        color: "#1B1B18",
        minHeight: "100%",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, borderBottom: "1px solid #DBD5C7", paddingBottom: 20 }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "#8A6A3E",
              marginBottom: 6,
            }}
          >
            PANNELLI SCORREVOLI O GIREVOLI — SISTEMA EVO — LISTINO 2025 v.1.8 (+6% ricarico)
          </div>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 38,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Configuratore Porte Scorrevoli
          </h1>
          <p style={{ color: "#5C584E", fontSize: 15, marginTop: 8, maxWidth: 620 }}>
            Pannelli scorrevoli su binario Evo, a soffitto o a parete. Prezzi e regole verificati
            su un preventivo reale.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32 }}>
          {/* Step nav */}
          <div>
            {STEPS.map((s) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    marginBottom: 4,
                    background: active ? "#1B1B18" : "transparent",
                    color: active ? "#F6F4EF" : "#1B1B18",
                    border: "1px solid " + (active ? "#1B1B18" : "transparent"),
                    borderRadius: 2,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "1px solid " + (active ? "#F6F4EF" : "#8A6A3E"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {done ? <Check size={12} /> : s.id}
                  </span>
                  {s.label}
                </button>
              );
            })}

            <div style={{ marginTop: 24, padding: 16, background: breakdown.incompatible ? "#F5DCD8" : "#EFEAE0", border: "1px solid " + (breakdown.incompatible ? "#B23B2E" : "#DBD5C7") }}>
              <div style={{ fontSize: 12, color: breakdown.incompatible ? "#B23B2E" : "#8A6A3E", letterSpacing: "0.05em" }}>
                {breakdown.incompatible ? "NON DISPONIBILE" : "TOTALE PARZIALE"}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: breakdown.incompatible ? 15 : 28, fontWeight: 600 }}>
                {breakdown.incompatible ? "Configurazione non realizzabile" : euro(breakdown.total)}
              </div>
            </div>
          </div>

          {/* Step content */}
          <div style={{ background: "#FFFFFF", border: "1px solid #DBD5C7", padding: 28, minHeight: 380 }}>
            {step === 0 && (
              <StepBlock title="0. Collezione">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {COLLECTIONS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (!c.available) return;
                        setCollectionId(c.id);
                        if (!UNO_COMPATIBLE_COLLECTIONS.includes(c.id)) setRailSystem("evo");
                        if (c.id === "sail") {
                          setApplicazione("parete");
                          if (numAnte > 2) setNumAnte(2);
                        }
                        if (c.id === "and" && numAnte > 1) setNumAnte(1);
                        if (c.id === "sail" && railTypeId === "3vie") setRailTypeId("2vie");
                        const firstType = (COLLECTION_PANEL_TYPES[c.id] || QUADRA_PANEL_TYPES)[0];
                        setPanelTypeId(firstType.id);
                        setFinishId(firstType.finishes[0].id);
                        setDivision("intero");
                        setVariantId(null);
                        const entry = HANDLES_BY_COLLECTION[c.id] || HANDLES;
                        const newHandles = Array.isArray(entry) ? entry : entry[firstType.id] || HANDLES;
                        if (!newHandles.find((h) => h.id === handleId)) {
                          setHandleId(newHandles[0].id);
                          setLockId("solo");
                        }
                      }}
                      disabled={!c.available}
                      style={{
                        padding: "18px 10px",
                        border: "1px solid " + (collectionId === c.id ? "#1B1B18" : "#DBD5C7"),
                        background: collectionId === c.id ? "#F6F4EF" : c.available ? "#FFFFFF" : "#FAF9F5",
                        cursor: c.available ? "pointer" : "not-allowed",
                        textAlign: "center",
                        opacity: c.available ? 1 : 0.5,
                      }}
                    >
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 600 }}>{c.label}</div>
                      {!c.available && <div style={{ fontSize: 11, color: "#8A8577", marginTop: 4 }}>dati in arrivo</div>}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "#8A8577", marginTop: 16 }}>
                  Al momento solo la collezione Quadra ha listino prezzi completo. Le altre
                  collezioni verranno popolate una volta estratte le rispettive tabelle dal
                  listino.
                </p>
              </StepBlock>
            )}

            {step === 1 && (
              <StepBlock title="1. Applicazione e binario">
                {collectionId === "and" ? (
                  <p style={{ fontSize: 14, color: "#5C584E" }}>
                    And utilizza un binario a scomparsa nella parete, il cui costo è già compreso
                    nel prezzo del pannello — nessuna voce di binario aggiuntiva da configurare.
                  </p>
                ) : collectionId === "sail" ? (
                  <div>
                    <p style={{ fontSize: 14, color: "#5C584E" }}>
                      Sail utilizza un binario dedicato a parete (1 via), non compatibile con il
                      sistema Evo/Uno delle altre collezioni.
                    </p>
                    <FieldGroup label="Binario Sail a parete">
                      <OptionRow selected label={`1 via — ${SAIL_RAIL.code}`} price={`${euro(SAIL_RAIL.pricePerMl * MARKUP)}/ml`} />
                    </FieldGroup>
                  </div>
                ) : (
                  <>
                    <FieldGroup label="Applicazione">
                      {APPLICAZIONI.map((a) => (
                        <OptionRow
                          key={a.id}
                          selected={applicazione === a.id}
                          onClick={() => {
                            setApplicazione(a.id);
                            const opts = RAIL_BY_APPLICATION[a.id];
                            if (!opts.find((r) => r.id === railTypeId)) setRailTypeId(opts[0].id);
                            if (a.id !== "soffitto") setRailSystem("evo");
                          }}
                          label={a.label}
                        />
                      ))}
                    </FieldGroup>
                    {applicazione === "soffitto" && UNO_COMPATIBLE_COLLECTIONS.includes(collectionId) && (
                      <FieldGroup label="Sistema binario">
                        <OptionRow selected={railSystem === "evo"} onClick={() => setRailSystem("evo")} label="Evo" />
                        <OptionRow selected={railSystem === "uno"} onClick={() => setRailSystem("uno")} label="Uno" />
                      </FieldGroup>
                    )}
                    <FieldGroup label={`Tipo binario (${railSystem === "uno" && applicazione === "soffitto" && UNO_COMPATIBLE_COLLECTIONS.includes(collectionId) ? "Uno" : "Evo"} ${isWall ? "a parete" : "a soffitto"})`}>
                      {railOptions.map((r) => (
                        <OptionRow
                          key={r.id}
                          selected={railTypeId === r.id}
                          onClick={() => setRailTypeId(r.id)}
                          label={r.label}
                          price={
                            railSystem === "uno" && applicazione === "soffitto" && UNO_COMPATIBLE_COLLECTIONS.includes(collectionId) && UNO_RAIL_CEILING[r.id]
                              ? `${euro(UNO_RAIL_CEILING[r.id].pricePerMl * MARKUP)}/ml`
                              : `${euro(r.pricePerMl * MARKUP)}/ml`
                          }
                        />
                      ))}
                    </FieldGroup>
                    {isWall && (
                      <p style={{ fontSize: 13, color: "#8A8577" }}>
                        Con applicazione a parete la lunghezza del binario è sempre il doppio della
                        larghezza vano.
                      </p>
                    )}
                    {(applicazione === "soffitto" || applicazione === "parete-soffitto") && BUILTIN_BEAM_BY_VIA[railTypeId] && (
                  <FieldGroup label="Trave da incasso">
                    <OptionRow selected={!travaIncasso} onClick={() => setTravaIncasso(false)} label="Senza trave da incasso" price="incluso" />
                    <OptionRow
                      selected={travaIncasso}
                      onClick={() => setTravaIncasso(true)}
                      label="Con trave da incasso per binario a soffitto"
                      price={`${euro(BUILTIN_BEAM_BY_VIA[railTypeId].pricePerMl * MARKUP)}/ml`}
                    />
                  </FieldGroup>
                )}
                  </>
                )}
              </StepBlock>
            )}

            {step === 2 && (
              <StepBlock title="2. Configurazione ante">
                <FieldGroup label="Numero ante">
                  {(collectionId === "and" ? [1] : collectionId === "sail" ? [1, 2] : [1, 2, 3, 4]).map((n) => (
                    <OptionRow key={n} selected={numAnte === n} onClick={() => setNumAnte(n)} label={`${n} ${n === 1 ? "anta" : "ante"}`} />
                  ))}
                </FieldGroup>
                {!["sail","and"].includes(collectionId) && (
                <FieldGroup label="Profilo di battuta (opzionale)">
                  <OptionRow selected={!profiloBattuta} onClick={() => setProfiloBattuta(false)} label="Senza profilo di battuta" price="incluso" />
                  <OptionRow selected={profiloBattuta} onClick={() => setProfiloBattuta(true)} label="Con profilo di battuta" price={`+${euro(201 * MARKUP)}`} />
                </FieldGroup>
                )}
                {!["sail","and"].includes(collectionId) && profiloBattuta && (
                  <FieldGroup label="Orientamento profilo di battuta">
                    {JAMB_TYPES.filter((j) => j.codeByVia[railTypeId]).map((j) => (
                      <OptionRow key={j.id} selected={jambTypeId === j.id} onClick={() => setJambTypeId(j.id)} label={j.label} />
                    ))}
                  </FieldGroup>
                )}
                {isWall && !["sail","and"].includes(collectionId) && (
                  <p style={{ fontSize: 13, color: "#8A8577" }}>
                    Nelle configurazioni a parete viene aggiunta automaticamente la coppia di
                    tappi di chiusura.
                  </p>
                )}
              </StepBlock>
            )}

            {step === 3 && (
              <StepBlock title="3. Dimensioni vano">
                <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
                  <NumberField label="Larghezza vano (mm)" value={larghezza} onChange={setLarghezza} />
                  <NumberField label="Altezza vano (mm)" value={altezza} onChange={setAltezza} />
                </div>
                <p style={{ fontSize: 13, color: "#8A8577", marginTop: 12 }}>
                  Larghezza per singola anta calcolata: {(larghezza / numAnte).toFixed(0)} mm — fascia
                  listino {breakdown.wBand.label} mm / {breakdown.hBand.label} mm
                </p>
              </StepBlock>
            )}

            {step === 4 && (
              <StepBlock title="4. Pannello">
                <FieldGroup label="Tipo pannello">
                  {panelTypesForCollection.map((p) => (
                    <OptionRow
                      key={p.id}
                      selected={panelTypeId === p.id}
                      onClick={() => {
                        setPanelTypeId(p.id);
                        setFinishId(p.finishes[0].id);
                        if (!p.hasDivisions) setDivision("intero");
                        setVariantId(null);
                        const entry = HANDLES_BY_COLLECTION[collectionId] || HANDLES;
                        const newHandles = Array.isArray(entry) ? entry : entry[p.id] || HANDLES;
                        if (!newHandles.find((h) => h.id === handleId)) {
                          setHandleId(newHandles[0].id);
                          setLockId("solo");
                        }
                      }}
                      label={p.label}
                    />
                  ))}
                </FieldGroup>
                <FieldGroup label="Finitura">
                  {panelType.finishes.map((f) => {
                    const wIdxNow = Math.min(findBandIndex(panelType.widthBands || WIDTH_BANDS, larghezza / numAnte), panelType.widthCols - 1);
                    const priceLabel =
                      f.type === "pct"
                        ? f.value[wIdxNow] === 0
                          ? "incluso"
                          : f.value[wIdxNow] == null
                          ? "non disp."
                          : `+${f.value[wIdxNow]}%`
                        : f.value === 0
                        ? "incluso"
                        : `+${euro(f.value * MARKUP)}`;
                    return <OptionRow key={f.id} selected={finishId === f.id} onClick={() => setFinishId(f.id)} label={f.label} price={priceLabel} />;
                  })}
                </FieldGroup>
                {panelType.hasDivisions && (
                  <FieldGroup label="Divisioni">
                    {DIVISIONS.filter((d) => !panelType.availableDivisionIds || panelType.availableDivisionIds.includes(d.id)).map((d) => (
                      <OptionRow key={d.id} selected={division === d.id} onClick={() => setDivision(d.id)} label={d.label} price={d.delta ? `+${euro(d.delta * MARKUP)}` : "incluso"} />
                    ))}
                  </FieldGroup>
                )}
                {panelType.variants && (
                  <FieldGroup label="Variante anta (nessun sovrapprezzo)">
                    {panelType.variants
                      .filter((v) => {
                        const wIdxNow = Math.min(findBandIndex(panelType.widthBands || WIDTH_BANDS, larghezza / numAnte), panelType.widthCols - 1);
                        const wBandNow = (panelType.widthBands || WIDTH_BANDS)[wIdxNow];
                        return wBandNow.min >= v.min && wBandNow.max <= v.max;
                      })
                      .map((v) => (
                        <OptionRow key={v.id} selected={variantId === v.id} onClick={() => setVariantId(v.id)} label={`${v.label} (${v.code})`} />
                      ))}
                  </FieldGroup>
                )}
                {panelType.widthCols < 5 && (
                  <p style={{ fontSize: 13, color: "#8A8577" }}>
                    {panelType.label} non è disponibile oltre L 1300 mm per singola anta.
                  </p>
                )}
              </StepBlock>
            )}

            {step === 5 && (
              <StepBlock title="5. Maniglia e serratura">
                <FieldGroup label="Modello maniglia">
                  {handlesForCollection.map((h) => (
                    <OptionRow key={h.id} selected={handleId === h.id} onClick={() => { setHandleId(h.id); if (!h[lockId]) setLockId("solo"); }} label={h.label} price={`da +${euro(h.solo * MARKUP)}`} />
                  ))}
                </FieldGroup>
                <FieldGroup label="Sistema di chiusura">
                  {LOCK_TYPES.map((l) => {
                    const h = handlesForCollection.find((h) => h.id === handleId);
                    const price = h[l.id];
                    if (price == null) return null;
                    return <OptionRow key={l.id} selected={lockId === l.id} onClick={() => setLockId(l.id)} label={l.label} price={`+${euro(price * MARKUP)}`} />;
                  })}
                </FieldGroup>
              </StepBlock>
            )}

            {step === 6 && (
              <StepBlock title="6. Riepilogo preventivo">
                {breakdown.incompatible ? (
                  <div style={{ padding: 16, background: "#F5DCD8", border: "1px solid #B23B2E" }}>
                    <p style={{ fontSize: 14, color: "#7A2A20", margin: 0 }}>{breakdown.incompatibleReason}</p>
                  </div>
                ) : (
                <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1B1B18" }}>
                      <th style={{ textAlign: "left", padding: "6px 4px" }}>Codice</th>
                      <th style={{ textAlign: "left", padding: "6px 4px" }}>Descrizione</th>
                      <th style={{ textAlign: "right", padding: "6px 4px" }}>Qtà</th>
                      <th style={{ textAlign: "right", padding: "6px 4px" }}>Unitario</th>
                      <th style={{ textAlign: "right", padding: "6px 4px" }}>Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #EEE9DD" }}>
                        <td style={{ padding: "8px 4px", fontFamily: "monospace" }}>{it.code}</td>
                        <td style={{ padding: "8px 4px" }}>{it.desc}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>{it.qty}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>{euro(it.unit)}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>{euro(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 22,
                    fontWeight: 600,
                    paddingTop: 16,
                    marginTop: 8,
                    borderTop: "2px solid #1B1B18",
                  }}
                >
                  <span>Totale</span>
                  <span>{euro(breakdown.total)}</span>
                </div>
                <p style={{ fontSize: 12, color: "#8A8577", marginTop: 16 }}>
                  Prezzi di listino (Albed V1.8 2025, p.236-251) maggiorati del 6%.
                </p>
                </>
                )}
              </StepBlock>
            )}

            <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
              {step > 0 ? (
                <button
                  onClick={goBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    color: "#1B1B18",
                    border: "1px solid #DBD5C7",
                    padding: "10px 18px",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeft size={16} /> Indietro
                </button>
              ) : (
                <div />
              )}
              {step < STEPS.length - 1 && (
                <button
                  onClick={goNext}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#1B1B18",
                    color: "#F6F4EF",
                    border: "none",
                    padding: "10px 18px",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Continua <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBlock({ title, children }) {
  return (
    <div>
      <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 600, marginTop: 0, marginBottom: 20 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "#8A6A3E", marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "#8A6A3E", marginBottom: 8 }}>{label.toUpperCase()}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #DBD5C7",
          fontSize: 15,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function OptionRow({ selected, onClick, label, price }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        border: "1px solid " + (selected ? "#1B1B18" : "#DBD5C7"),
        background: selected ? "#F6F4EF" : "#FFFFFF",
        cursor: "pointer",
        fontSize: 14,
        textAlign: "left",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1px solid #1B1B18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {selected && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1B1B18" }} />}
        </span>
        {label}
      </span>
      {price && <span style={{ color: "#5C584E" }}>{price}</span>}
    </button>
  );
}
