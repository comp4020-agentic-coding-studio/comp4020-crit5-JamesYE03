// Sound. Two different mechanisms on purpose:
//
// The music and the two result stings are files in `public/`, played through
// <audio>. The per-keystroke click is synthesised, because at eight keys a
// second one <audio> element would keep cutting its own tail off, and eight
// elements would be worse.

const CLICK_GAIN = 0.075;
const THUD_GAIN = 0.14;
const MUSIC_GAIN = 0.32;

export type Sound = ReturnType<typeof createSound>;

export function createSound() {
  let ctx: AudioContext | null = null;
  let music: HTMLAudioElement | null = null;
  const stings = new Map<string, HTMLAudioElement>();

  /** Browsers keep an AudioContext suspended until a real gesture, so this is
   *  only ever called from inside the first keystroke handler. */
  function wake(): void {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    }
    void ctx?.resume();
  }

  function file(name: string, { loop = false, volume = 1 } = {}): HTMLAudioElement {
    const el = new Audio(`./${name}`);
    el.loop = loop;
    el.volume = volume;
    // The music is several megabytes: nothing waits for it, it just arrives.
    el.preload = "none";
    return el;
  }

  function key(correct: boolean): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (correct) {
      // A short filtered noise burst: the tick of a key bottoming out.
      const frames = Math.floor(ctx.sampleRate * 0.03);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1900 + Math.random() * 700;
      band.Q.value = 1.1;

      gain.gain.setValueAtTime(CLICK_GAIN, now);
      // exponentialRamp cannot target zero; ramp to an epsilon and stop.
      gain.gain.exponentialRampToValueAtTime(1e-4, now + 0.035);
      source.connect(band).connect(gain);
      source.start(now);
      source.stop(now + 0.05);
      return;
    }

    // A wrong key is a dull knock, low enough to feel like a stumble.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.11);
    gain.gain.setValueAtTime(THUD_GAIN, now);
    gain.gain.exponentialRampToValueAtTime(1e-4, now + 0.13);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  function startMusic(): void {
    music ??= file("crit5bgm.mp3", { loop: true, volume: MUSIC_GAIN });
    music.currentTime = 0;
    // Autoplay can still refuse; the game does not depend on it.
    void music.play().catch(() => {});
  }

  function stopMusic(): void {
    music?.pause();
  }

  /** The two stings are small, and an ending is a bad moment to start a
   *  download. Warmed once the run is under way. */
  function warmStings(): void {
    for (const name of ["victory.mp3", "fail.mp3"]) {
      if (stings.has(name)) continue;
      const el = file(name, { volume: 0.7 });
      el.preload = "auto";
      el.load();
      stings.set(name, el);
    }
  }

  function sting(outcome: "escaped" | "caught"): void {
    stopMusic();
    const name = outcome === "escaped" ? "victory.mp3" : "fail.mp3";
    warmStings();
    const el = stings.get(name);
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }

  return { wake, key, startMusic, stopMusic, warmStings, sting };
}
