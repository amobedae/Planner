// Thin wrappers over the Web Speech APIs. Both are optional: callers feature-detect.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canListen = typeof window !== 'undefined' && !!recognitionCtor();
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function listen(onText: (text: string, final: boolean) => void, onEnd: () => void): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    const parts = Array.from(e.results);
    const text = parts.map((r) => r[0].transcript).join('');
    const last = parts[parts.length - 1] as unknown as { isFinal?: boolean };
    onText(text, !!last?.isFinal);
  };
  rec.onerror = () => onEnd();
  rec.onend = () => onEnd();
  rec.start();
  return () => rec.stop();
}

export function speak(text: string) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[•✓○]/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\n+/g, '. ');
  const u = new SpeechSynthesisUtterance(clean);
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|arthur|george/i.test(v.name)) ??
    voices.find((v) => /en-GB/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang));
  if (preferred) u.voice = preferred;
  u.rate = 1.02;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
