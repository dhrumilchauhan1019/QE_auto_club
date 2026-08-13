import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import api from '../api/axios';

// Wraps the Twilio Voice SDK so any page can do click-to-call with a couple of function calls.
// status: 'offline' | 'connecting-device' | 'ready' | 'connecting' | 'in-progress' | 'error'
export function useTwilioDevice() {
  const deviceRef = useRef(null);
  const connRef = useRef(null);
  const [status, setStatus] = useState('connecting-device');
  const [error, setError] = useState('');
  const [callSid, setCallSid] = useState(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { data } = await api.get('/twilio/token');
        if (cancelled) return;

        const device = new Device(data.token, {
          logLevel: 'error',
          // Opus gives noticeably better voice quality than the default PCMU, which matters a
          // lot for downstream transcription accuracy - especially over spotty mobile networks.
          codecPreferences: ['opus', 'pcmu'],
        });
        device.on('registered', () => setStatus('ready'));
        device.on('unregistered', () => setStatus('offline'));
        device.on('tokenWillExpire', async () => {
          // Fires ~30s before the token expires - fetch a fresh one and hand it to the Device
          // so it never actually goes stale. This is what stops the red AccessTokenInvalid
          // error from appearing when the portal is left open/idle for a while.
          try {
            const { data } = await api.get('/twilio/token');
            device.updateToken(data.token);
          } catch (e) {
            console.error('Could not refresh Twilio token', e);
          }
        });
        device.on('error', (e) => {
          // 20101/20104 = invalid/expired access token. Rather than showing a scary red error
          // for something the user can't act on, try one silent token refresh first and only
          // surface an error if that refresh itself fails.
          if (e.code === 20101 || e.code === 20104) {
            api
              .get('/twilio/token')
              .then(({ data }) => device.updateToken(data.token))
              .catch(() => setError('Session expired - please reload the page.'));
            return;
          }
          setError(e.message || 'Dialer error');
          setStatus('error');
        });

        // Explicitly request the microphone BEFORE registering, so we get a real,
        // user-visible error if permission is denied or no mic is available - instead of
        // silently proceeding with a broken/empty audio track (which is what happened
        // before: the browser sent silence and the prospect couldn't hear the agent at all).
        // NOTE: we intentionally do NOT call device.audio.setAudioConstraints() here anymore -
        // it caused a regression where the mic stream was captured but carried no real audio
        // on some devices/browsers. Chrome/most browsers already default getUserMedia() to
        // echoCancellation, noiseSuppression and autoGainControl all being ON, so we get most
        // of the same benefit without the custom override that broke things.
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          testStream.getTracks().forEach((t) => t.stop()); // just testing access, release it
        } catch (micErr) {
          console.error('Microphone permission/access failed', micErr);
          setError('Microphone access was blocked or unavailable. Click the padlock/site info icon in your browser address bar, allow microphone access for this site, then reload the page.');
          setStatus('error');
          return;
        }

        await device.register();
        deviceRef.current = device;
      } catch (e) {
        setError(e.response?.data?.error || e.message || 'Could not initialize the dialer.');
        setStatus('error');
      }
    }

    setup();
    return () => {
      cancelled = true;
      deviceRef.current?.destroy();
    };
  }, []);

  const call = useCallback(async ({ to, prospectId, callerId }) => {
    if (!deviceRef.current) return;
    setError('');
    setStatus('connecting');

    const conn = await deviceRef.current.connect({ params: { To: to, prospectId, callerId } });
    connRef.current = conn;

    conn.on('accept', () => {
      setStatus('in-progress');
      setCallSid(conn.parameters?.CallSid || null);
    });
    conn.on('disconnect', () => {
      setStatus('ready');
      setMuted(false);
      setError(''); // clear any lingering error banner (e.g. ConnectionError) once the call is over
    });
    conn.on('cancel', () => {
      setStatus('ready');
      setError('');
    });
    conn.on('reject', () => {
      setStatus('ready');
      setError('');
    });
    conn.on('error', (e) => {
      setError(e.message || 'Call error');
      setStatus('ready');
    });
  }, []);

  const hangup = useCallback(() => {
    connRef.current?.disconnect();
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    connRef.current?.mute(next);
    setMuted(next);
  }, [muted]);

  return { status, error, callSid, muted, call, hangup, toggleMute };
}