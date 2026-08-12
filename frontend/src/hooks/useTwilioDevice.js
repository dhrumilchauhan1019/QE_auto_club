import { useEffect, useRef, useState, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
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
  const [qualityWarning, setQualityWarning] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { data } = await api.get('/twilio/token');
        if (cancelled) return;

        // Fix for the agent (browser) leg sounding weaker/dropping out vs the PSTN leg:
        // - Opus has built-in packet-loss concealment/FEC; PCMU (what the PSTN leg already
        //   uses) does not, so the browser<->Twilio leg is far more sensitive to the
        //   public-internet packet loss that a phone-network leg never sees.
        // - forceAggressiveIceNomination works around a known Chrome WebRTC bug where audio
        //   quality degrades / drops out over the course of a call due to ICE re-nomination.
        const device = new Device(data.token, {
          logLevel: 'error',
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
          forceAggressiveIceNomination: true,
        });
        device.on('registered', () => setStatus('ready'));
        device.on('unregistered', () => setStatus('offline'));
        device.on('error', (e) => {
          setError(e.message || 'Dialer error');
          setStatus('error');
        });

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
      setQualityWarning(null);
    });
    conn.on('cancel', () => setStatus('ready'));
    conn.on('reject', () => setStatus('ready'));
    conn.on('error', (e) => {
      setError(e.message || 'Call error');
      setStatus('ready');
    });
    // Twilio raises these when the browser<->Twilio leg (i.e. the agent's own audio,
    // not the prospect's) is seeing packet loss / jitter / low MOS in real time.
    // Logged for now — surface `qualityWarning` in the UI if you want the agent to see it live.
    conn.on('warning', (name) => {
      console.warn('[call quality]', name);
      setQualityWarning(name);
    });
    conn.on('warning-cleared', (name) => {
      console.info('[call quality cleared]', name);
      setQualityWarning((prev) => (prev === name ? null : prev));
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

  return { status, error, callSid, muted, qualityWarning, call, hangup, toggleMute };
}