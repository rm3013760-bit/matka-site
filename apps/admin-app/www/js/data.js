const MARKETS = [
  { id: "kalyan-main", name: "Kalyan Main", open: "08:00", close: "10:00", result: "11:00", days: "All days" },
  { id: "kalyan-night", name: "Kalyan Night", open: "09:30", close: "23:30", result: "00:30", days: "All days" },
  { id: "sridevi-morning", name: "Sridevi Morning", open: "08:00", close: "10:00", result: "10:00", days: "All days" },
  { id: "sridevi-night", name: "Sridevi Night", open: "09:00", close: "12:00", result: "12:00", days: "All days" },
  { id: "milan-day", name: "Milan Day", open: "08:00", close: "10:00", result: "11:00", days: "All days" },
  { id: "milan-night", name: "Milan Night", open: "08:00", close: "10:00", result: "21:00", days: "All days" },
  { id: "rajdhani-day", name: "Rajdhani Day", open: "08:00", close: "10:00", result: "10:30", days: "All days" },
  { id: "rajdhani-night", name: "Rajdhani Night", open: "08:00", close: "10:00", result: "21:30", days: "All days" },
  { id: "time-bazar", name: "Time Bazar", open: "08:00", close: "10:00", result: "10:00", days: "All days" },
  { id: "king-line", name: "King Line", open: "08:00", close: "10:00", result: "10:15", days: "All days" },
  { id: "supreme-day", name: "Supreme Day", open: "08:00", close: "10:00", result: "10:45", days: "All days" },
  { id: "supreme-night", name: "Supreme Night", open: "08:00", close: "10:00", result: "21:15", days: "All days" },
  { id: "star-line", name: "Star Line", open: "08:00", close: "10:00", result: "10:30", days: "All days" },
  { id: "madhur-day", name: "Madhur Day", open: "08:00", close: "10:00", result: "11:00", days: "All days" },
  { id: "madhur-night", name: "Madhur Night", open: "08:00", close: "10:00", result: "21:00", days: "All days" },
  { id: "golden-morning", name: "Golden Morning", open: "08:00", close: "10:00", result: "10:30", days: "All days" },
  { id: "golden-night", name: "Golden Night", open: "08:00", close: "10:00", result: "21:30", days: "All days" },
  { id: "new-padmini-day", name: "New Padmini Day", open: "08:00", close: "10:00", result: "10:15", days: "All days" },
  { id: "new-padmini-night", name: "New Padmini Night", open: "08:00", close: "10:00", result: "21:15", days: "All days" },
  { id: "padmini-day", name: "Padmini Day", open: "08:00", close: "10:00", result: "11:15", days: "All days" },
  { id: "padmini-night", name: "Padmini Night", open: "08:00", close: "10:00", result: "21:45", days: "All days" },
  { id: "gali", name: "Gali", open: "08:00", close: "10:00", result: "10:00", days: "All days" },
  { id: "disawar", name: "Disawar", open: "08:00", close: "10:00", result: "10:00", days: "All days" },
  { id: "ghaziabad", name: "Ghaziabad", open: "08:00", close: "10:00", result: "10:00", days: "All days" },
  { id: "faridabad", name: "Faridabad", open: "08:00", close: "10:00", result: "10:00", days: "All days" },
  { id: "ratan-line", name: "Ratan Line", open: "08:00", close: "10:00", result: "10:15", days: "All days" },
  { id: "bhamru", name: "Bhamru", open: "08:00", close: "10:00", result: "10:45", days: "All days" },
  { id: "madhuban", name: "Madhuban", open: "08:00", close: "10:00", result: "10:15", days: "All days" },
  { id: "super-fast", name: "Super Fast", open: "08:00", close: "10:00", result: "10:30", days: "All days" },
  { id: "taj-mumbai", name: "Taj Mumbai", open: "08:00", close: "10:00", result: "10:45", days: "All days" }
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
