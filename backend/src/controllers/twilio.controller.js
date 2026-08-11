// Twilio Voice integration: browser dialer token + TwiML webhooks + call summary
const twilio = require('twilio');
const prisma = require('../config/database');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET,
  TWILIO_TWIML_APP_SID,
  TWILIO_PHONE_NUMBER,
  PUBLIC_BASE_URL, // e.g. https://your-backend.onrender.com  (must be publicly reachable by Twilio)
} = process.env;

// Gemini model alias - Google keeps this pointed at their current recommended flash model,
// so you shouldn't need to change it again when they deprecate a dated version.
const GEMINI_MODEL = 'gemini-flash-latest';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// GET /api/twilio/token
// The logged-in caller's browser calls this to get a short-lived token for the Twilio Voice SDK.
async function token(req, res) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET || !TWILIO_TWIML_APP_SID) {
    return res.status(500).json({ error: 'Twilio is not configured on the server yet. Check backend/.env.' });
  }

  const identity = req.user.id; // one softphone identity per app user
  const accessToken = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
    identity,
    ttl: 3600,
  });
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWILIO_TWIML_APP_SID,
    incomingAllow: false, // this app only makes outbound calls
  });
  accessToken.addGrant(voiceGrant);

  res.json({ token: accessToken.toJwt(), identity });
}

// POST /api/twilio/voice
// Twilio calls this (the TwiML App's "Voice URL") the instant Device.connect() fires in the browser.
async function voice(req, res) {
  const to = req.body.To;
  const prospectId = req.body.prospectId;
  const callerId = req.body.callerId;
  const callSid = req.body.CallSid;

  const twiml = new twilio.twiml.VoiceResponse();

  if (!to) {
    twiml.say('No destination number was provided for this call.');
    return res.type('text/xml').send(twiml.toString());
  }

  if (prospectId) {
    await prisma.call
      .create({
        data: {
          prospectId,
          callerId: callerId || null,
          callSid,
          toNumber: to,
          fromNumber: TWILIO_PHONE_NUMBER,
          status: 'initiated',
        },
      })
      .catch((e) => console.error('twilio.voice: could not create Call record', e.message));
  }

  const dial = twiml.dial({
    callerId: TWILIO_PHONE_NUMBER,
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${PUBLIC_BASE_URL}/api/twilio/recording-status`,
    recordingStatusCallbackEvent: 'completed',
    action: `${PUBLIC_BASE_URL}/api/twilio/dial-status`,
  });
  dial.number(to);

  res.type('text/xml').send(twiml.toString());
}

// POST /api/twilio/dial-status
// Fires when the <Dial> leg (the actual call to the prospect) ends.
async function dialStatus(req, res) {
  const { CallSid, DialCallStatus, DialCallDuration } = req.body;

  if (CallSid) {
    await prisma.call
      .updateMany({
        where: { callSid: CallSid },
        data: {
          status: DialCallStatus || 'completed',
          duration: DialCallDuration ? parseInt(DialCallDuration, 10) : undefined,
          endedAt: new Date(),
        },
      })
      .catch((e) => console.error('twilio.dialStatus error', e.message));
  }

  const twiml = new twilio.twiml.VoiceResponse();
  res.type('text/xml').send(twiml.toString());
}

// POST /api/twilio/status
// Optional general status callback (wire this into the TwiML App's "Status Callback URL" if you want
// ringing / in-progress updates in near real time, e.g. to drive a "ringing..." UI state).
async function status(req, res) {
  const { CallSid, CallStatus, CallDuration } = req.body;

  if (CallSid) {
    await prisma.call
      .updateMany({
        where: { callSid: CallSid },
        data: {
          status: CallStatus,
          duration: CallDuration ? parseInt(CallDuration, 10) : undefined,
          endedAt: ['completed', 'busy', 'failed', 'no-answer', 'canceled'].includes(CallStatus)
            ? new Date()
            : undefined,
        },
      })
      .catch((e) => console.error('twilio.status error', e.message));
  }

  res.sendStatus(200);
}

// POST /api/twilio/recording-status
// Fires once the call recording is ready. Stores the recording URL on the Call record.
async function recordingStatus(req, res) {
  const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;

  if (CallSid) {
    await prisma.call
      .updateMany({
        where: { callSid: CallSid },
        data: {
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl ? `${RecordingUrl}.mp3` : undefined,
          duration: RecordingDuration ? parseInt(RecordingDuration, 10) : undefined,
        },
      })
      .catch((e) => console.error('twilio.recordingStatus error', e.message));
  }

  res.sendStatus(200);
}

// GET /api/twilio/calls/:prospectId  -> call history for a prospect
async function callsForProspect(req, res) {
  const calls = await prisma.call.findMany({
    where: { prospectId: req.params.prospectId },
    orderBy: { startedAt: 'desc' },
  });
  res.json(calls);
}

// GET /api/twilio/calls/by-sid/:callSid  -> look a call up by its Twilio CallSid
// (the frontend gets the CallSid from the Voice SDK connection once it's accepted)
async function callBySid(req, res) {
  const call = await prisma.call.findUnique({ where: { callSid: req.params.callSid } });
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
}

// POST /api/twilio/calls/:id/summary
// Generates an AI summary of the call. Uses the recorded transcript if one has been attached
// (e.g. via Twilio Voice Intelligence, or any transcription service you wire into call.transcript),
// otherwise falls back to the caller's typed notes + call metadata.
async function summarize(req, res) {
  const call = await prisma.call.findUnique({ where: { id: req.params.id }, include: { prospect: true } });
  if (!call) return res.status(404).json({ error: 'Call not found' });

  const { notes } = req.body;
  const basis = call.transcript
    ? `Call transcript:\n${call.transcript}`
    : `Caller notes: ${notes || '(none provided)'}\nCall duration: ${call.duration || 0}s. Status: ${call.status}.`;

  const prompt = `You are summarizing a B2B sales call for "${call.prospect.businessName}". ${basis}\nWrite a 3-4 sentence summary covering: what was discussed, the prospect's reaction, and the recommended next step. Plain text only, no headers.`;

  let summary = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 220 },
          }),
        }
      );
      const data = await r.json();
      summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (e) {
      console.error('twilio.summarize: Gemini call failed', e.message);
    }
  } else if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 220,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });
      const data = await r.json();
      summary = data.content?.[0]?.text?.trim() || null;
    } catch (e) {
      console.error('twilio.summarize: Anthropic call failed', e.message);
    }
  }

  if (!summary) {
    summary = `Call with ${call.prospect.businessName} lasted ${call.duration || 0}s (${call.status}). ${
      notes ? 'Notes: ' + notes : 'No notes recorded.'
    }`;
  }

  await prisma.call.update({ where: { id: call.id }, data: { summary } });
  res.json({ summary });
}

module.exports = { token, voice, status, dialStatus, recordingStatus, callsForProspect, callBySid, summarize };