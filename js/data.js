const MARKETS = [
  { id: "sita-morning",      slug: "SITA%20MORNING",       name: "SITA MORNING",      open: "09:45", close: "10:45", result: "10:45", days: "All days", live: true },
  { id: "star-tara-morning", slug: "STAR%20TARA%20MORNING", name: "STAR TARA MORNING", open: "10:10", close: "11:10", result: "11:10", days: "All days", live: true },
  { id: "milan-morning",     slug: "MILAN%20MORNING",       name: "MILAN MORNING",     open: "10:30", close: "11:30", result: "11:30", days: "All days", live: true },
  { id: "andhra-morning",    slug: "ANDHRA%20MORNING",      name: "ANDHRA MORNING",    open: "10:40", close: "11:40", result: "11:40", days: "All days", live: true },
  { id: "madhur-morning",    slug: "MADHUR%20MORNING",      name: "MADHUR MORNING",    open: "11:30", close: "12:30", result: "12:30", days: "All days", live: true },
  { id: "sridevi",           slug: "SRIDEVI",               name: "SRIDEVI",           open: "11:35", close: "12:35", result: "12:35", days: "All days", live: true },
  { id: "kalyan-morning",    slug: "Kalyan%20Morning",      name: "Kalyan Morning",    open: "11:40", close: "12:40", result: "12:40", days: "All days", live: true },
  { id: "kamal-morning",     slug: "KAMAL%20MORNING",       name: "KAMAL MORNING",     open: "12:10", close: "13:10", result: "13:10", days: "All days", live: true },
  { id: "time-bazar",        slug: "TIME%20BAZAR",          name: "TIME BAZAR",        open: "13:00", close: "14:00", result: "14:00", days: "All days", live: true },
  { id: "madhur-day",        slug: "MADHUR%20DAY",          name: "MADHUR DAY",        open: "13:30", close: "14:30", result: "14:30", days: "All days", live: true },
  { id: "sita-day",          slug: "SITA%20DAY",            name: "SITA DAY",          open: "13:45", close: "14:45", result: "14:45", days: "All days", live: true },
  { id: "star-tara-day",     slug: "STAR%20TARA%20DAY",     name: "STAR TARA DAY",     open: "14:20", close: "15:20", result: "15:20", days: "All days", live: true },
  { id: "milan-day",         slug: "MILAN%20DAY",           name: "MILAN DAY",         open: "15:00", close: "17:00", result: "17:00", days: "All days", live: true },
  { id: "rajdhani-day",      slug: "RAJDHANI%20DAY",        name: "RAJDHANI DAY",      open: "15:10", close: "17:10", result: "17:10", days: "All days", live: true },
  { id: "supreme-day",       slug: "SUPREME%20DAY",         name: "SUPREME DAY",       open: "15:35", close: "17:35", result: "17:35", days: "All days", live: true },
  { id: "andhra-day",        slug: "ANDHRA%20DAY",          name: "ANDHRA DAY",        open: "15:35", close: "17:35", result: "17:35", days: "All days", live: true },
  { id: "kamal-day",         slug: "KAMAL%20DAY",           name: "KAMAL DAY",         open: "15:40", close: "17:40", result: "17:40", days: "All days", live: true },
  { id: "kalyan-main",       slug: "KALYAN",                name: "KALYAN",            open: "16:00", close: "18:00", result: "18:00", days: "All days", live: true },
  { id: "mahadevi",          slug: "MAHADEVI",              name: "MAHADEVI",          open: "16:30", close: "18:30", result: "18:30", days: "All days", live: true },
  { id: "sita-night",        slug: "SITA%20NIGHT",          name: "SITA NIGHT",        open: "18:45", close: "19:45", result: "19:45", days: "All days", live: true },
  { id: "sridevi-night",     slug: "SRIDEVI%20NIGHT",       name: "SRIDEVI NIGHT",     open: "19:15", close: "20:15", result: "20:15", days: "All days", live: true },
  { id: "star-tara-night",   slug: "STAR%20TARA%20NIGHT",   name: "STAR TARA NIGHT",   open: "19:20", close: "20:20", result: "20:20", days: "All days", live: true },
  { id: "kamal-night",       slug: "KAMAL%20NIGHT",         name: "KAMAL NIGHT",       open: "20:45", close: "22:45", result: "22:45", days: "All days", live: true },
  { id: "andhra-night",      slug: "ANDHRA%20NIGHT",        name: "ANDHRA NIGHT",      open: "20:45", close: "22:45", result: "22:45", days: "All days", live: true },
  { id: "supreme-night",     slug: "SUPREME%20NIGHT",       name: "SUPREME NIGHT",     open: "20:45", close: "22:45", result: "22:45", days: "All days", live: true },
  { id: "milan-night",       slug: "MILAN%20NIGHT",         name: "MILAN NIGHT",       open: "21:10", close: "23:10", result: "23:10", days: "All days", live: true },
  { id: "rajdhani-night",    slug: "RAJDHANI%20NIGHT",      name: "RAJDHANI NIGHT",    open: "21:35", close: "23:45", result: "23:45", days: "All days", live: true },
  { id: "kalyan-night",      slug: "KALYAN%20NIGHT",        name: "KALYAN NIGHT",      open: "21:40", close: "23:40", result: "23:40", days: "All days", live: true },
  { id: "main-bazar",        slug: "MAIN%20BAZAR",          name: "MAIN BAZAR",        open: "22:00", close: "24:10", result: "24:10", days: "All days", live: true }
];

const GAMES = [
  { id: "single",       name: "Single Digit",    code: "SD", desc: "Pick one digit (0-9). Match the last digit of the result to win.",              range: "0 - 9",      odds: "9.6x" },
  { id: "jodi",         name: "Jodi Digit",      code: "JD", desc: "Pick a pair (00-99). Match the two-digit Jodi result to win.",                   range: "00 - 99",    odds: "96x" },
  { id: "single-patti", name: "Single Pana",     code: "SP", desc: "Three-digit number with all digits different (e.g. 123).",                      range: "000 - 999",  odds: "150x" },
  { id: "double-patti", name: "Double Pana",     code: "DP", desc: "Three-digit number with one digit repeated (e.g. 122).",                        range: "000 - 999",  odds: "300x" },
  { id: "triple-patti", name: "Triple Pana",     code: "TP", desc: "Three-digit number with all digits same (e.g. 111).",                          range: "000 - 999",  odds: "700x" },
  { id: "half-sangam",  name: "Half Sangam (A)", code: "HA", desc: "Jodi of the open panel + Pana of the open panel.",                             range: "Jodi + Pana",odds: "1000x" },
  { id: "half-sangam-b",name: "Half Sangam (B)", code: "HB", desc: "Jodi of the open panel + Pana of the close panel.",                            range: "Jodi + Pana",odds: "1000x" },
  { id: "full-sangam",  name: "Full Sangam",     code: "FS", desc: "Pana of the open panel + Pana of the close panel.",                            range: "Pana + Pana",odds: "10000x" },
  { id: "family-pair",  name: "Jodi Family",     code: "JF", desc: "11 families of Jodi pairs. Pick a family (00/55, 01/56, etc.).",              range: "11 families",odds: "9x" },
  { id: "pana-family",  name: "Pana Family",     code: "PF", desc: "Pick a digit (0-9). Win if the open panel contains that digit.",                range: "0 - 9",      odds: "150x" },
  { id: "motor",        name: "Motor",           code: "MO", desc: "Pick a 2-digit motor number (e.g. 14, 28).",                                  range: "00 - 99",    odds: "50x" },
  { id: "jodi-close",   name: "Jodi Close",      code: "JC", desc: "Close side Jodi play (result of the close panel).",                            range: "00 - 99",    odds: "96x" }
];

const STARLINE_TIMES = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
];

const DISAWAR_MARKETS = ["Disawar Main", "Disawar Satta Bazar"];

const STARLINE_RATES = { single: "9.5x", jodi: "96x", single_pana: "150x", double_pana: "300x", triple_pana: "700x" };

const FAMILY_PAIRS = [
  ["00", "55"], ["01", "56"], ["02", "57"], ["03", "58"], ["04", "59"], ["05", "60"],
  ["06", "61"], ["07", "62"], ["08", "63"], ["09", "64"], ["10", "65"]
];

const DEFAULT_PANEL = "456";
const DEMO_UPI = "matkalive@upi";

const BID_STYLES = [
  { id: "single",           label: "Single Digit",       game: "single" },
  { id: "single-bulk",      label: "Single Digit Bulk",  game: "single" },
  { id: "jodi",             label: "Jodi Digit",         game: "jodi" },
  { id: "jodi-bulk",        label: "Jodi Digit Bulk",    game: "jodi" },
  { id: "single-patti",     label: "Single Pana",        game: "single-patti" },
  { id: "single-patti-bulk",label: "Single Pana Bulk",   game: "single-patti" },
  { id: "double-patti",     label: "Double Pana",        game: "double-patti" },
  { id: "double-patti-bulk",label: "Double Pana Bulk",   game: "double-patti" },
  { id: "triple-patti",     label: "Triple Pana",        game: "triple-patti" },
  { id: "triple-patti-bulk",label: "Triple Pana Bulk",   game: "triple-patti" },
  { id: "half-sangam-a",    label: "Half Sangam (A)",    game: "half-sangam" },
  { id: "half-sangam-b",    label: "Half Sangam (B)",    game: "half-sangam-b" },
  { id: "full-sangam",      label: "Full Sangam",        game: "full-sangam" },
  { id: "family-pair",      label: "Jodi Family",        game: "family-pair" },
  { id: "family-pair-bulk", label: "Jodi Family Bulk",   game: "family-pair" },
  { id: "pana-family",      label: "Pana Family",        game: "pana-family" },
  { id: "pana-family-bulk", label: "Pana Family Bulk",   game: "pana-family" },
  { id: "motor",            label: "Motor",              game: "motor" },
  { id: "motor-bulk",       label: "Motor Bulk",         game: "motor" },
  { id: "jodi-close",       label: "Jodi Close",         game: "jodi-close" },
  { id: "jodi-close-bulk",  label: "Jodi Close Bulk",    game: "jodi-close" }
];
