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
        device.on('error', (e) => {
          setError(e.message || 'Dialer error');
          setStatus('error');
        });

        // Force echo cancellation / noise suppression / auto gain ON regardless of the browser's
        // or OS's default. This matters most when using a phone/PC speaker instead of a headset:
        // without echo cancellation, the mic picks up your own voice coming back out of the
        // speaker, which both muddies the recording and confuses call transcription (it can start
        // to look like a third "phantom" speaker). setAudioConstraints must be called before
        // setInputDevice/register for it to apply to the very first call.
        try {
          await device.audio.setAudioConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
        } catch (e) {
          console.warn('Could not set audio constraints', e);
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
    });
    conn.on('cancel', () => setStatus('ready'));
    conn.on('reject', () => setStatus('ready'));
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