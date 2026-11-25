type SoundType = "jump" | "coin" | "powerup" | "hit" | "gameOver";

let audioContext: AudioContext | null = null;
let muted = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

export function playSound(type: SoundType) {
  if (muted) return;

  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  const sounds = {
    jump: { start: 280, end: 520, duration: 0.12 },
    coin: { start: 700, end: 1100, duration: 0.1 },
    powerup: { start: 400, end: 1000, duration: 0.3 },
    hit: { start: 180, end: 60, duration: 0.25 },
    gameOver: { start: 300, end: 70, duration: 0.6 },
  };

  const sound = sounds[type];
  const now = context.currentTime;

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(sound.start, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    sound.end,
    now + sound.duration,
  );

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + sound.duration);
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
