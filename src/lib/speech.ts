/**
 * 系统发音（Web Speech API）
 *
 * 原则：**能力探测 + 静默降级**。
 * 浏览器没有语音合成、没有装英语语音包、iOS 静音键打开时，都不能让按钮看起来能用却没反应 ——
 * 上层通过 speechSupported() 决定是否置灰并给出说明。
 */
import type { Settings } from '../types'

let voices: SpeechSynthesisVoice[] = []
let primed = false

function synth(): SpeechSynthesis | null {
  if (typeof globalThis === 'undefined') return null
  const s = (globalThis as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  return s && typeof s.speak === 'function' ? s : null
}

export function speechSupported(): boolean {
  return Boolean(synth() && typeof globalThis.SpeechSynthesisUtterance === 'function')
}

/** 提前加载语音列表：部分浏览器首次调用时列表为空，需要等 voiceschanged */
export function primeVoices(): void {
  const s = synth()
  if (!s || primed) return
  primed = true
  const read = () => {
    voices = s.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'))
  }
  read()
  if (typeof s.addEventListener === 'function') s.addEventListener('voiceschanged', read)
}

/** 找一个匹配口音的英语语音 */
function pickVoice(accent: Settings['accent']): SpeechSynthesisVoice | undefined {
  const want = accent === 'uk' ? 'en-gb' : 'en-us'
  return (
    voices.find((v) => v.lang?.toLowerCase().replace('_', '-') === want) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ??
    undefined
  )
}

/** 朗读单词；返回是否真的发出声音（false 表示当前环境不支持） */
export function speak(text: string, opts: Pick<Settings, 'accent' | 'speechRate'>): boolean {
  const s = synth()
  if (!s || !speechSupported() || !text) return false
  try {
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = opts.accent === 'uk' ? 'en-GB' : 'en-US'
    u.rate = Math.max(0.5, Math.min(1.5, opts.speechRate))
    const v = pickVoice(opts.accent)
    if (v) u.voice = v
    s.speak(u)
    return true
  } catch {
    return false
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel()
  } catch {
    /* 忽略：部分浏览器在页面卸载时会抛错 */
  }
}
