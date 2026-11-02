import { encodeWav } from './wav';

export async function recordingToWav(blob: Blob) {
  if (!blob.size) throw new Error('The recording is empty. Please record again.');
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) throw new Error('The recording has no audio. Please record again.');
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start(0);
    const rendered = await offline.startRendering();
    return new File([encodeWav(rendered.getChannelData(0), 16000)], 'recording.wav', { type: 'audio/wav' });
  } finally { await context.close(); }
}
