/** Per-bead feedback: a tiny haptic tick, and optionally a soft click. */

let ctx: AudioContext | null = null

export function beadFeedback(sound: boolean): void {
  navigator.vibrate?.(8)
  if (!sound) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    // a soft wooden tick: a high sine that dies in ~70ms
    osc.frequency.setValueAtTime(1400, t)
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.07)
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.08)
  } catch {
    // audio is a nicety; never let it break prayer
  }
}
