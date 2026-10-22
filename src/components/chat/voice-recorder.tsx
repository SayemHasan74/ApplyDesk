'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import { recordingToWav } from '@/lib/client/audio';

export function VoiceRecorder({ disabled, visible, onAudio, onBusy }: { disabled: boolean; visible: boolean; onAudio: (file: File) => void; onBusy: (busy: boolean) => void }) {
  const [recording, setRecording] = useState(false), [preparing, setPreparing] = useState(false), [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), alive = useRef(true), frame = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const shown = useRef(visible);
  useEffect(() => { shown.current = visible; if (!visible) { if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); } }, [visible]);
  function stop() { if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); cancelAnimationFrame(frame.current); if (timer.current) clearTimeout(timer.current); };
  }, []);
  async function start() {
    if (disabled || busy.current) return; busy.current = true; setPreparing(true); onBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Voice recording is not supported in this browser. Please type your message.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || !shown.current) { media.getTracks().forEach((track) => track.stop()); busy.current = false; if (alive.current) { setPreparing(false); onBusy(false); } return; }
      stream.current = media;
      const current = new MediaRecorder(media), chunks: Blob[] = []; recorder.current = current;
      current.ondataavailable = (event) => { if (alive.current && event.data.size) chunks.push(event.data); };
      current.onstop = async () => {
        cancelAnimationFrame(frame.current); if (timer.current) clearTimeout(timer.current);
        media.getTracks().forEach((track) => track.stop());
        if (!alive.current) return; setRecording(false); setPreparing(true);
        try { const file = await recordingToWav(new Blob(chunks, { type: current.mimeType })); if (alive.current) onAudio(file); }
        catch { if (alive.current) toast.error('The recording could not be read. Please record again or type your message.'); }
        finally { chunks.length = 0; busy.current = false; if (alive.current) { setPreparing(false); onBusy(false); } }
      };
      current.onerror = () => { stop(); toast.error('Recording stopped unexpectedly. Please record again.'); };
      current.start(); setPreparing(false); setRecording(true); setSeconds(0);
      const started = performance.now(); let previous = 0;
      const tick = () => { const next = Math.floor((performance.now() - started) / 1000); if (next !== previous) { previous = next; setSeconds(next); } if (current.state === 'recording') frame.current = requestAnimationFrame(tick); };
      frame.current = requestAnimationFrame(tick); timer.current = setTimeout(stop, 45_000);
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop()); busy.current = false;
      if (alive.current) { setPreparing(false); onBusy(false); toast.error(error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name) ? 'Microphone permission was denied. Allow it in your browser or type your message.' : error instanceof Error ? error.message : 'Could not start the microphone.'); }
    }
  }
  return <button type="button" className={`chat-icon-button ${recording ? 'text-destructive' : ''}`} aria-label={recording ? `Stop recording, ${seconds} seconds` : preparing ? 'Preparing voice recording' : 'Record voice'} aria-pressed={recording} disabled={preparing || (disabled && !recording)} onClick={() => recording ? stop() : void start()}>
    {recording ? <><Square className="size-4" aria-hidden="true" /><span className="text-xs tabular-nums">{seconds}s</span></> : <Mic className="size-4" aria-hidden="true" />}
  </button>;
}
