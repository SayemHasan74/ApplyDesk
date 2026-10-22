'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/client/image';
import { chatError } from '@/lib/client/chat-request';
import { VoiceRecorder } from './voice-recorder';

export function Composer({ pending, disabled, visible, remaining, limit, onSend, onStop }: {
  pending: boolean; disabled: boolean; visible: boolean; remaining: number | null; limit: string;
  onSend: (text: string, image?: File, audio?: File) => Promise<boolean>; onStop: () => void;
}) {
  const [text, setText] = useState(''), [image, setImage] = useState<File>(), [preview, setPreview] = useState(''), [audio, setAudio] = useState<File>();
  const [preparing, setPreparing] = useState(false), [recording, setRecording] = useState(false);
  const input = useRef<HTMLInputElement>(null), imageUrl = useRef(''), alive = useRef(true), locked = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); }; }, []);
  async function attach(file: File) {
    if (locked.current || disabled || pending || preparing || recording) return; locked.current = true; setPreparing(true);
    try {
      const compressed = await compressImage(file); if (!alive.current) return;
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      imageUrl.current = URL.createObjectURL(compressed); setImage(compressed); setPreview(imageUrl.current);
    } catch (error) { if (alive.current) toast.error(chatError(error)); }
    finally { locked.current = false; if (alive.current) setPreparing(false); }
  }
  function removeImage() { if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = ''; setImage(undefined); setPreview(''); }
  async function submit() {
    if (disabled || pending || preparing || recording || locked.current) return; locked.current = true;
    const sent = onSend(text, image, audio);
    // Clear only after the request was accepted; the bubble owns its own image preview.
    if (await sent) { setText(''); removeImage(); setAudio(undefined); }
    locked.current = false;
  }
  return <div className="chat-composer border-t bg-card p-4" onPaste={(event) => {
    const file = [...event.clipboardData.items].find((item) => item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); void attach(file); }
  }}>
    {preview && <div className="mb-2 flex items-start gap-2"><Image src={preview} alt="Pending screenshot" width={112} height={80} unoptimized className="max-h-20 w-28 rounded border object-contain" /><button type="button" className="chat-icon-button" aria-label="Remove image" disabled={pending || disabled} onClick={removeImage}><X className="size-4" /></button></div>}
    {audio && <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span>Voice recording ready</span><button type="button" className="chat-icon-button" aria-label="Remove voice recording" disabled={pending || disabled} onClick={() => setAudio(undefined)}><X className="size-4" /></button></div>}
    <label className="sr-only" htmlFor="chat-message">Message the ApplyDesk assistant</label>
    <textarea id="chat-message" className="form-control min-h-24 resize-none" rows={3} maxLength={15000} value={text} disabled={disabled || pending || preparing || recording} placeholder="Type, paste a screenshot, or record a message…" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }
    }} />
    <div className="mt-2 flex items-center gap-2"><input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Attach screenshot" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void attach(file); }} />
      <button type="button" className="chat-icon-button" aria-label="Attach image" disabled={disabled || pending || preparing || recording} onClick={() => input.current?.click()}><Paperclip className="size-4" aria-hidden="true" /></button>
      <VoiceRecorder disabled={disabled || pending || preparing} visible={visible} onAudio={setAudio} onBusy={setRecording} />
      <span className="ml-auto text-xs text-muted-foreground" role="status">{preparing ? 'Preparing image…' : recording ? 'Recording / preparing audio…' : ''}</span>
      {pending ? <button type="button" className="chat-icon-button" aria-label="Stop AI request" onClick={onStop}><Square className="size-4" /></button> : <button type="button" className="action-button px-3" aria-label="Send message" disabled={disabled || preparing || recording || (!text.trim() && !image && !audio)} onClick={() => void submit()}><Send className="size-4" aria-hidden="true" /></button>}
    </div>
    <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{limit || (remaining === null ? 'Checking AI requests…' : `${remaining} AI requests left today`)}</p>
  </div>;
}
