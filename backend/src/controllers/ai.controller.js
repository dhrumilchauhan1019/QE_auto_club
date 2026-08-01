// sanitized-data AI helper, falls back to local heuristics with no API key set
const prisma = require('../config/database');

const PROMPTS = {
  call_summary: 'Summarize this prospect for a caller about to dial: likely objections and one talking point.',
  proposal_summary: 'Write a 3-sentence proposal cover summary for this fleet prospect.',
  next_action: 'Suggest one concrete next action for this prospect.',
  followup_suggestion: 'Suggest a follow-up date and reason for this prospect.'
};

async function assist(req, res) {
  const type = req.query.type || 'call_summary';
  const prospect = await prisma.prospect.findUnique({
    where: { id: req.params.id },
    include: { activities: { orderBy: { createdAt: 'desc' }, take: 10 } }
  });
  if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

  const sanitized = {
    industry: prospect.industry,
    vehicleCount: prospect.vehicleCount,
    tier: prospect.overrideTier || prospect.tier,
    status: prospect.status,
    notes: prospect.activities.map(a => `${a.outcome}: ${a.notes || ''}`)
  };

  let text, source = 'local_heuristic';
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 250,
          messages: [{ role: 'user', content: `Sanitized prospect data: ${JSON.stringify(sanitized)}. ${PROMPTS[type] || PROMPTS.call_summary} Draft only, under 80 words, for human review.` }]
        })
      });
      const data = await r.json();
      text = data.content?.[0]?.text || 'AI response unavailable.';
      source = 'anthropic_api';
    } catch (e) {
      text = fallback(type, sanitized);
    }
  } else {
    text = fallback(type, sanitized);
  }

  res.json({ type, text, source, disclosure: 'AI-generated draft, requires human review.', requiresHumanReview: true });
}

function fallback(type, d) {
  const last = d.notes[0] || 'no prior contact';
  if (type === 'proposal_summary') return `${d.tier}-tier prospect with ${d.vehicleCount} vehicles in ${d.industry || 'their industry'}. Stewardship coverage would reduce downtime and stabilize maintenance costs.`;
  if (type === 'next_action') return `Schedule a follow-up call to confirm decision-maker availability; last outcome was ${last}.`;
  if (type === 'followup_suggestion') return `Follow up in 2 business days given current stage (${d.status}).`;
  return `Tier ${d.tier}, ${d.vehicleCount} vehicles, ${d.industry || 'unspecified industry'}. Last outcome: ${last}. Lead with fleet-size-appropriate cost savings.`;
}

module.exports = { assist };
