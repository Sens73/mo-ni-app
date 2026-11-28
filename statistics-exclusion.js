import { usageStatistics, STATISTICS_EXCLUSION_KEY } from "./usage-statistics.js?v=0.14.0-release-6";
usageStatistics.exclude();
let persisted = false;
try { persisted = localStorage.getItem(STATISTICS_EXCLUSION_KEY) === "1"; } catch { /* The explicit test URL remains safe without storage. */ }
document.querySelector("#test-status").textContent = persisted
  ? "Deine eigenen App-Aufrufe werden auf diesem Browser nicht mitgezählt."
  : "Öffne die App zum Testen bitte über den folgenden Button. Dein Browser kann den dauerhaften Testschutz gerade nicht speichern.";
const audience = new URLSearchParams(location.search).get("audience");
if (["34", "56", "713"].includes(audience)) document.querySelector("#test-app").href = `./?stats=off&view=home&audience=${audience}`;
