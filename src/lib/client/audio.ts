import { encodeWav } from './wav';

export async function recordingToWav(blob: Blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start(0);
    const rendered = await offline.startRendering();
    return new File([encodeWav(rendered.getChannelData(0), 16000)], 'recording.wav', { type: 'audio/wav' });
  } finally { await context.close(); }
}
