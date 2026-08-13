import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import api from '../api/axios';

// Error codes that mean "the underlying connection/session went stale" (e.g. phone/PC was
// asleep and the WebSocket to Twilio died in the background) rather than something the user
// needs to act on. These get silently recovered from instead of shown as a red alert.
const STALE_SESSION_CODES = new Set([20101, 20104, 31005, 31009]);

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
          // 20101/20104 = invalid/expired token, 31005/31009 = dead WebSocket/transport
          // (typically from the phone/PC sleeping). None of these are user-actionable, so
          // instead of a scary red alert, quietly rebuild the whole device connection.
          if (STALE_SESSION_CODES.has(e.code)) {
            console.warn('Stale Twilio session detected, reconnecting silently...', e.code, e.message);
            reconnectDevice();
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

    // Fully tears down and rebuilds the Device with a fresh token + fresh WebSocket. Used both
    // when a stale-session error is caught, and proactively when the tab/phone wakes up from
    // sleep, so the connection is already healthy before you even try to make a call.
    async function reconnectDevice() {
      try {
        deviceRef.current?.destroy();
      } catch {}
      deviceRef.current = null;
      await setup();
    }

    setup();

    // Rebuild the connection when the tab becomes visible again (phone screen turned back on,
    // PC woken from sleep, or switching back from another app/tab) - this is what stops the
    // red error from ever appearing, instead of just reacting to it after a failed call.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && deviceRef.current) {
        reconnectDevice();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
      if (STALE_SESSION_CODES.has(e.code)) {
        // Same stale-session case, just happened mid-call-attempt - no red alert, just reset
        // quietly so the next call attempt starts clean (the visibilitychange/error handlers
        // above will already be rebuilding the device in the background).
        console.warn('Stale session during call, resetting silently...', e.code, e.message);
        setStatus('ready');
        return;
      }
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