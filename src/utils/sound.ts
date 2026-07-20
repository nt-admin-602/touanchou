// 操作音（Web Audio APIで都度合成。音声ファイルは使わない）

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) {
    audioCtx = new Ctor()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playTone(
  freq: number,
  durationMs: number,
  type: OscillatorType,
  volume: number,
  attackMs = 0,
  pitchDropRatio = 1,
) {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  const now = ctx.currentTime
  const durationSec = durationMs / 1000
  osc.frequency.setValueAtTime(freq, now)
  if (pitchDropRatio !== 1) {
    osc.frequency.exponentialRampToValueAtTime(freq * pitchDropRatio, now + durationSec)
  }
  // アタックを付けて立ち上がりを丸め、耳に硬く刺さらないようにする
  const attackSec = Math.max(attackMs / 1000, 0.001)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + attackSec)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationSec)
}

/** タップ操作（ボタン押下・配置・選択など）: 「ポチッ」という短い音 */
export function playTapSound() {
  playTone(880, 45, 'sine', 0.12)
}

/** 増減・スナップ吸着（+/-ボタン、グリッド吸着の1段階）: 柔らかく短い「コトッ」という音 */
export function playStepSound() {
  playTone(1100, 40, 'sine', 0.08, 4, 0.82)
}
