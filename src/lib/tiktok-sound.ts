/** Interaction sounds copied from the UpCoin synthesis, played only on request. */
const SOUND_PREFERENCE_KEY = "drava-tiktok-sound-enabled";
const SOUND_CHANGE_EVENT = "drava-tiktok-sound-change";
const SAMPLE_RATE = 44100;
const MASTER_VOLUME = 0.35;

type SoundName =
  | "tap"
  | "pop"
  | "toggleOn"
  | "toggleOff"
  | "stepUp"
  | "stepDown"
  | "modalOpen"
  | "modalClose"
  | "success"
  | "failure"
  | "error";
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let memoryPreference = true;
let preferenceWriteFailed = false;
const audioBuffers = new Map<SoundName, AudioBuffer>();
const lastPlayTimes = new Map<SoundName, number>();
function normalizeSamples(
  samples: Float32Array,
  targetPeak = 0.08,
): Float32Array {
  let maxPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  if (maxPeak > 0) {
    const scale = targetPeak / maxPeak;
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= scale;
    }
  }
  return samples;
}

// --- GÉNÉRATEURS DE SIGNAUX ACOUSTIQUES FEUTRÉS ---

function generateSamples(type: SoundName): Float32Array {
  let length = 0;
  let targetPeak = 0.075;
  let generator: (t: number) => number;

  switch (type) {
    case "tap": {
      // Tap feutré très doux (0.038s)
      length = Math.floor(SAMPLE_RATE * 0.038);
      targetPeak = 0.065;
      generator = (t) => {
        const progress = t / 0.038;
        const freq = 340 - progress * 190;
        const env =
          Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) *
          Math.exp(-t / 0.009);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "pop": {
      // Bulle acoustique discrète (0.045s)
      length = Math.floor(SAMPLE_RATE * 0.045);
      targetPeak = 0.07;
      generator = (t) => {
        const progress = t / 0.045;
        const freq = 460 - progress * 210;
        const env =
          Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) *
          Math.exp(-t / 0.012);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "toggleOn": {
      // Interrupteur montant feutré (0.09s)
      length = Math.floor(SAMPLE_RATE * 0.09);
      targetPeak = 0.075;
      generator = (t) => {
        let sample = 0;
        if (t < 0.045) {
          const env1 =
            Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) *
            Math.exp(-t / 0.012);
          sample += Math.sin(2 * Math.PI * 440 * t) * env1 * 0.8;
        }
        if (t >= 0.032) {
          const t2 = t - 0.032;
          const env2 =
            Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) *
            Math.exp(-t2 / 0.018);
          sample += Math.sin(2 * Math.PI * 660 * t2) * env2;
        }
        return sample;
      };
      break;
    }
    case "toggleOff": {
      // Interrupteur descendant feutré (0.09s)
      length = Math.floor(SAMPLE_RATE * 0.09);
      targetPeak = 0.075;
      generator = (t) => {
        let sample = 0;
        if (t < 0.045) {
          const env1 =
            Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) *
            Math.exp(-t / 0.012);
          sample += Math.sin(2 * Math.PI * 580 * t) * env1 * 0.8;
        }
        if (t >= 0.032) {
          const t2 = t - 0.032;
          const env2 =
            Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) *
            Math.exp(-t2 / 0.018);
          sample += Math.sin(2 * Math.PI * 390 * t2) * env2;
        }
        return sample;
      };
      break;
    }
    case "stepUp": {
      // Étape suivante douce (0.055s)
      length = Math.floor(SAMPLE_RATE * 0.055);
      targetPeak = 0.07;
      generator = (t) => {
        const progress = t / 0.055;
        const freq = 420 + progress * 170;
        const env =
          Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) *
          Math.exp(-t / 0.016);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "stepDown": {
      // Étape précédente douce (0.055s)
      length = Math.floor(SAMPLE_RATE * 0.055);
      targetPeak = 0.07;
      generator = (t) => {
        const progress = t / 0.055;
        const freq = 530 - progress * 150;
        const env =
          Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) *
          Math.exp(-t / 0.016);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "modalOpen": {
      // Ouverture aérienne très douce (0.07s)
      length = Math.floor(SAMPLE_RATE * 0.07);
      targetPeak = 0.065;
      generator = (t) => {
        const progress = t / 0.07;
        const freq = 280 + progress * 190;
        const env =
          Math.sin(Math.min(1, t / 0.005) * Math.PI * 0.5) *
          Math.exp(-t / 0.022);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "modalClose": {
      // Fermeture aérienne très douce (0.06s)
      length = Math.floor(SAMPLE_RATE * 0.06);
      targetPeak = 0.065;
      generator = (t) => {
        const progress = t / 0.06;
        const freq = 410 - progress * 170;
        const env =
          Math.sin(Math.min(1, t / 0.004) * Math.PI * 0.5) *
          Math.exp(-t / 0.018);
        return Math.sin(2 * Math.PI * freq * t) * env;
      };
      break;
    }
    case "success": {
      // Carillon de succès harmonique équilibré (0.55s) : C5 -> E5 -> G5 -> C6
      length = Math.floor(SAMPLE_RATE * 0.55);
      targetPeak = 0.085;
      generator = (t) => {
        let sample = 0;
        const notes = [
          { freq: 523.25, start: 0.0, decay: 0.14, gain: 0.75 },
          { freq: 659.25, start: 0.06, decay: 0.16, gain: 0.85 },
          { freq: 783.99, start: 0.12, decay: 0.18, gain: 0.95 },
          { freq: 1046.5, start: 0.18, decay: 0.24, gain: 1.05 },
        ];
        for (const note of notes) {
          if (t >= note.start) {
            const dt = t - note.start;
            const env =
              Math.sin(Math.min(1, dt / 0.006) * Math.PI * 0.5) *
              Math.exp(-dt / note.decay);
            const tone =
              Math.sin(2 * Math.PI * note.freq * dt) +
              0.15 * Math.sin(4 * Math.PI * note.freq * dt);
            sample += tone * env * note.gain;
          }
        }
        return sample;
      };
      break;
    }
    case "failure": {
      // Mélodie d'échec / annulation feutrée et apaisante (0.50s) : A4 -> F4 -> D4
      length = Math.floor(SAMPLE_RATE * 0.5);
      targetPeak = 0.08;
      generator = (t) => {
        let sample = 0;
        const notes = [
          { freq: 440.0, start: 0.0, decay: 0.12, gain: 0.8 },
          { freq: 349.23, start: 0.11, decay: 0.14, gain: 0.9 },
          { freq: 293.66, start: 0.22, decay: 0.22, gain: 1.0 },
        ];
        for (const note of notes) {
          if (t >= note.start) {
            const dt = t - note.start;
            const env =
              Math.sin(Math.min(1, dt / 0.006) * Math.PI * 0.5) *
              Math.exp(-dt / note.decay);
            const tone = Math.sin(2 * Math.PI * note.freq * dt);
            sample += tone * env * note.gain;
          }
        }
        return sample;
      };
      break;
    }
    case "error": {
      // Avertissement discret feutré (0.12s)
      length = Math.floor(SAMPLE_RATE * 0.12);
      targetPeak = 0.07;
      generator = (t) => {
        let sample = 0;
        if (t < 0.06) {
          const env1 =
            Math.sin(Math.min(1, t / 0.003) * Math.PI * 0.5) *
            Math.exp(-t / 0.015);
          sample += Math.sin(2 * Math.PI * 280 * t) * env1 * 0.8;
        }
        if (t >= 0.045) {
          const t2 = t - 0.045;
          const env2 =
            Math.sin(Math.min(1, t2 / 0.003) * Math.PI * 0.5) *
            Math.exp(-t2 / 0.02);
          sample += Math.sin(2 * Math.PI * 230 * t2) * env2;
        }
        return sample;
      };
      break;
    }
  }

  const rawSamples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    rawSamples[i] = generator(t);
  }
  return normalizeSamples(rawSamples, targetPeak);
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  if (preferenceWriteFailed) return memoryPreference;
  try {
    const saved = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
    if (saved !== null) memoryPreference = saved === "true";
  } catch {
    // Retain the in-memory setting when storage is unavailable.
  }
  return memoryPreference;
}

export function subscribeToSound(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SOUND_PREFERENCE_KEY || event.key === null) {
      memoryPreference = event.newValue !== "false";
      preferenceWriteFailed = false;
      onChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(SOUND_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SOUND_CHANGE_EVENT, onChange);
  };
}

export function setSoundEnabled(enabled: boolean): void {
  memoryPreference = enabled;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
    preferenceWriteFailed = false;
  } catch {
    preferenceWriteFailed = true;
    // A blocked preference write must not prevent muting.
  }
  window.dispatchEvent(new Event(SOUND_CHANGE_EVENT));
  if (enabled) playToggle(true);
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

function playSound(name: SoundName, minimumInterval = 15, rate = 1): void {
  if (typeof window === "undefined" || !isSoundEnabled()) return;
  const now = performance.now();
  if (
    now - (lastPlayTimes.get(name) ?? Number.NEGATIVE_INFINITY) <
    minimumInterval
  )
    return;
  lastPlayTimes.set(name, now);
  try {
    if (!audioContext || audioContext.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext = new AudioContextClass({ latencyHint: "interactive" });
      masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(MASTER_VOLUME, audioContext.currentTime);
      masterGain.connect(audioContext.destination);
      audioBuffers.clear();
    }
    const context = audioContext;
    const output = masterGain;
    const play = () => {
      if (context.state !== "running" || !isSoundEnabled() || !output) return;
      try {
        let buffer = audioBuffers.get(name);
        if (!buffer) {
          const samples = generateSamples(name);
          buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
          buffer.getChannelData(0).set(samples);
          audioBuffers.set(name, buffer);
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = Number.isFinite(rate)
          ? Math.min(2, Math.max(0.5, rate))
          : 1;
        source.connect(output);
        source.onended = () => source.disconnect();
        source.start();
      } catch {
        // Audio availability never affects the action being performed.
      }
    };
    if (context.state === "suspended")
      void context
        .resume()
        .then(play)
        .catch(() => {});
    else play();
  } catch {
    // Unsupported Web Audio or browser playback restrictions remain silent.
  }
}

export function playTap(): void {
  playSound("tap", 20);
}
export function playPop(pitchMultiplier = 1): void {
  playSound("pop", 20, pitchMultiplier);
}
export function playToggle(active = true): void {
  playSound(active ? "toggleOn" : "toggleOff", 30);
}
export function playStep(forward = true): void {
  playSound(forward ? "stepUp" : "stepDown", 30);
}
export function playModalOpen(): void {
  playSound("modalOpen", 40);
}
export function playModalClose(): void {
  playSound("modalClose", 40);
}
export function playSuccess(): void {
  playSound("success", 200);
}
export function playFailure(): void {
  playSound("failure", 200);
}
export function playError(): void {
  playSound("error", 50);
}
