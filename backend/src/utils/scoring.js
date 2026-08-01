// additive point-based priority engine, 100 max
function vehiclePoints(count) {
  if (count >= 50) return 25;
  if (count >= 21) return 20;
  if (count >= 6) return 14;
  if (count >= 1) return 8;
  return 0;
}

function calculateScore(p) {
  const breakdown = [];
  let total = 0;

  const vp = vehiclePoints(p.vehicleCount || 0);
  breakdown.push(['Vehicle Count', vp]); total += vp;

  const up = clamp(p.urgency, 1, 5) * 4;
  breakdown.push(['Urgency', up]); total += up;

  const dmp = p.decisionMakerAccess ? 15 : 5;
  breakdown.push(['Decision Maker Access', dmp]); total += dmp;

  const locp = p.location ? 10 : 0;
  breakdown.push(['Location', locp]); total += locp;

  const fp = clamp(p.serviceFrequency, 1, 5) * 2;
  breakdown.push(['Service Frequency', fp]); total += fp;

  const ap = clamp(p.affordability, 1, 5) * 2;
  breakdown.push(['Affordability', ap]); total += ap;

  const cp = p.hasInternalService ? -10 : 10;
  breakdown.push(['In-house Capability', cp]); total += cp;

  const score = Math.max(0, Math.min(100, Math.round(total)));
  let tier = 'C';
  if (score >= 70) tier = 'A';
  else if (score >= 45) tier = 'B';

  const reason = breakdown.map(([label, pts]) => `${label}: ${pts >= 0 ? '+' : ''}${pts}`).join(', ') + `, Total: ${score}`;

  return { score, tier, reason, breakdown };
}

function clamp(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

module.exports = { calculateScore };
