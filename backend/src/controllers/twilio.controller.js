// Twilio Voice integration: browser dialer token + TwiML webhooks + call summary
const twilio = require('twilio');
const prisma = require('../config/database');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET,
  TWILIO_TWIML_APP_SID,
  TWILIO_PHONE_NUMBER,
  PUBLIC_BASE_URL, // e.g. https://your-backend.onrender.com  (must be publicly reachable by Twilio)
  GEMINI_API_KEY,
} = process.env;

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

// Downloads the recording from Twilio (requires Basic Auth) and transcribes it with Gemini,
// then saves the result onto the Call row. Twilio's recording media isn't always ready to
// download the instant the callback fires, so this retries a few times, and logs every
// failure reason to Render logs so problems are visible instead of silently swallowed.
async function transcribeRecording(callSid, mp3Url) {
  if (!GEMINI_API_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('twilio.transcribeRecording: skipped, missing GEMINI_API_KEY / TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN env var');
    return;
  }

  const authHeader = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  let audioBuffer = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const audioRes = await fetch(mp3Url, { headers: { Authorization: authHeader } });
      if (audioRes.ok) {
        audioBuffer = Buffer.from(await audioRes.arrayBuffer());
        break;
      }
      console.error(`twilio.transcribeRecording: download attempt ${attempt} got HTTP ${audioRes.status} for ${mp3Url}`);
    } catch (e) {
      console.error(`twilio.transcribeRecording: download attempt ${attempt} threw`, e.message);
    }
    await new Promise((r) => setTimeout(r, 3000)); // recording may not be encoded yet - wait and retry
  }

  if (!audioBuffer) {
    console.error('twilio.transcribeRecording: giving up, could not download recording after 4 attempts', mp3Url);
    return;
  }
  if (audioBuffer.length < 2000) {
    console.error(`twilio.transcribeRecording: recording is only ${audioBuffer.length} bytes - likely silent/near-empty audio, skipping transcription`, mp3Url);
    return;
  }

  try {
    const audioBase64 = audioBuffer.toString('base64');
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Transcribe this sales call recording. The speakers may talk in English, Hindi, Gujarati, or a mix of these (or other languages). Translate everything into English - do not leave any non-English words or sentences in the output. Label speaker turns as "Caller:" and "Prospect:" where you can tell them apart. Output must be plain text, English only.' },
                { inline_data: { mime_type: 'audio/mp3', data: audioBase64 } },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 2048 },
        }),
      }
    );
    if (!r.ok) {
      console.error(`twilio.transcribeRecording: Gemini HTTP ${r.status}`, (await r.text()).slice(0, 500));
      return;
    }
    const data = await r.json();
    const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (transcript) {
      await prisma.call.updateMany({ where: { callSid }, data: { transcript } });
      console.log(`twilio.transcribeRecording: saved transcript (${transcript.length} chars) for ${callSid}`);
    } else {
      console.error(
        'twilio.transcribeRecording: no transcript text in Gemini response - finishReason:',
        data.candidates?.[0]?.finishReason,
        'blockReason:', data.promptFeedback?.blockReason,
        JSON.stringify(data).slice(0, 500)
      );
    }
  } catch (e) {
    console.error('twilio.transcribeRecording: Gemini call threw', e.message);
  }
}


// POST /api/twilio/recording-status
// Fires once the call recording is ready. Stores the recording URL on the Call record and
// kicks off transcription in the background (not awaited - don't hold up Twilio's webhook).
async function recordingStatus(req, res) {
  const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
  const mp3Url = RecordingUrl ? `${RecordingUrl}.mp3` : undefined;

  if (CallSid) {
    await prisma.call
      .updateMany({
        where: { callSid: CallSid },
        data: {
          recordingSid: RecordingSid,
          recordingUrl: mp3Url,
          duration: RecordingDuration ? parseInt(RecordingDuration, 10) : undefined,
        },
      })
      .catch((e) => console.error('twilio.recordingStatus error', e.message));

    if (mp3Url) transcribeRecording(CallSid, mp3Url); // fire and forget
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

  const prompt = `You are summarizing a B2B sales call for "${call.prospect.businessName}". ${basis}\nWrite a 3-4 sentence summary covering: what was discussed, the prospect's reaction, and the recommended next step. The call may have included Hindi, Gujarati, English, or a mix - regardless of what language was used, your entire summary must be written in clear, professional English only. Do not include any non-English words. Plain text only, no headers.`;

  let summary = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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