// Stripped down version of Howler
// Largely credited to James Simpson and GoldFire Studios, Inc

import { isArray } from '@alloc/is'
import { attachRef } from '../functions/attachRef'
import { noop } from '../internal/util'
import { Observer, ReadonlyRef, Ref, isRef, observe, ref } from '../observable'

type Mutable<T> = { -readonly [P in keyof T]: T[P] }
type Pluck<T extends object | null, K extends keyof T> = T extends null
  ? null
  : K extends keyof T
  ? Pick<T, K>
  : null

const audioContext =
  typeof AudioContext !== 'undefined' ? new AudioContext() : null!

const useOgg = /* @__PURE__ */ checkAudioType('audio/ogg; codecs="vorbis"')
const useAac = !useOgg && /* @__PURE__ */ checkAudioType('audio/aac;')

const globalMuted = /* @__PURE__ */ ref(false)
const globalVolume = /* @__PURE__ */ ref(1)
const runningHowls = new Set<Howl>()

const enum ContextStatus {
  Running,
  Suspending,
  Suspended,
  RunOnceSuspended,
}

let contextStatusRef = ref(ContextStatus.Suspended)
let contextSuspendTimer: number | undefined

/**
 * The user's first interaction is what allows looping sounds to start playing.
 * If a non-looping sound is played before the first interaction, it will never
 * be played.
 */
let firstInteraction = observeFirstInteraction()

/**
 * The `Howl` class allows you to play sound files. It supports `.ogg` and
 * `.aac` file formats only, which is all you'll need for modern browser
 * support. Many of its properties are all observable.
 */
export class Howl<Sprite extends string | null = any>
  implements PromiseLike<void>
{
  readonly src: URL[]
  readonly sprite: Record<Extract<Sprite, string>, number[]> | undefined
  readonly spriteKey: Extract<Sprite, string> | null = null
  readonly statusRef: Ref<Howl.Status>
  readonly maxVolumeRef: Ref<number>
  readonly mutedRef: Ref<boolean> | ReadonlyRef<boolean>

  fadeOut: (duration: number) => void = noop
  buffer: AudioBuffer | null = null
  error: Error | null = null
  loop: boolean

  private loadObserver: Observer | null = null
  private disconnect: () => void = noop

  static get muted() {
    return globalMuted.value
  }
  static set muted(value: boolean) {
    globalMuted.value = value
  }

  static get volume() {
    return globalVolume.value
  }
  static set volume(value: number) {
    globalVolume.value = value
  }

  constructor(options: Howl.Options<Sprite>) {
    this.src = isArray(options.src)
      ? options.src.map(createSourceURL)
      : [createSourceURL(options.src)]
    this.sprite = options.sprite
    this.loop = options.loop ?? false

    this.statusRef = ref<Howl.Status>('loading')
    this.maxVolumeRef = ref(options.maxVolume ?? 1)
    this.mutedRef = isRef(options.muted)
      ? options.muted
      : ref(options.muted ?? false)

    attachRef(this, 'status', this.statusRef)
    attachRef(this, 'maxVolume', this.maxVolumeRef)
    attachRef(this, 'muted', this.mutedRef)

    // Pre-loading is always enabled.
    if (audioContext) {
      this.load()
    } else {
      // The properties need to be defined still, even if the Web Audio API is
      // not supported by this browser. But we can still “defang” the methods,
      // so they do nothing.
      this.play = noop
    }
  }

  /**
   * Play a sound. Resuming after a `stop` call is not yet supported.
   */
  play(options?: Howl.PlayOptions): Howl<Sprite>

  /**
   * Create a sprite instance and play it.
   */
  play<SpriteKey extends Extract<keyof Sprite, string>>(
    spriteKey: SpriteKey,
    options?: Howl.PlayOptions
  ): Howl<SpriteKey>

  /** @internal */
  play(
    spriteKey?: string | Howl.PlayOptions,
    options?: Howl.PlayOptions
  ): Howl {
    const status = this.statusRef.peek()

    if (typeof spriteKey == 'string') {
      const sprite = Object.create(this) as Mutable<Howl>
      sprite.spriteKey = spriteKey
      sprite.statusRef = ref(status)
      return sprite.play(options)
    }

    if (status === 'error' || status === 'playing') {
      return this
    }

    options = spriteKey

    if (status === 'loading') {
      this.loadObserver = observe(this.statusRef, status => {
        if (status !== 'error') {
          this.play(options)
        }
        this.loadObserver?.dispose()
        this.loadObserver = null
      })
      return this
    }

    if (!this.buffer) {
      throw Error('Buffer not loaded')
    }

    let startTime = 0
    let stopTime = this.buffer.duration

    if (this.sprite) {
      if (this.spriteKey == null) {
        throw Error('Sprite key required')
      }
      const spriteRange = this.sprite[this.spriteKey]
      if (!isArray(spriteRange)) {
        throw Error(`Invalid sprite key: "${this.spriteKey}"`)
      }
      startTime = spriteRange[0] / 1000
      stopTime = (spriteRange[0] + spriteRange[1]) / 1000
    }

    options ||= {}

    this.statusRef.value = 'playing'
    runningHowls.add(this)

    let schedule: ((effect: () => void) => void) | null =
      options.loop ?? this.loop ? firstInteraction : effect => effect()

    this.disconnect = () => {
      this.disconnect = noop

      schedule = null
      resetHowl(this)
    }

    schedule(() => {
      if (!schedule) return

      resumeAudioContext()

      const contextStatus = contextStatusRef.peek()
      if (contextStatus === ContextStatus.Running && !isInterrupted()) {
        this.connect(startTime, stopTime, options!)
      } else {
        const contextObserver = observe(contextStatusRef, suspended => {
          if (suspended === ContextStatus.Running && !isInterrupted()) {
            this.connect(startTime, stopTime, options!)
            contextObserver.dispose()
          }
        })

        this.disconnect = () => {
          this.disconnect = noop

          contextObserver.dispose()
          resetHowl(this)
        }
      }
    })

    return this
  }

  stop() {
    const status = this.statusRef.peek()
    if (status === 'loading' && this.loadObserver) {
      this.loadObserver.dispose()
      this.loadObserver = null
    } else if (status === 'playing') {
      this.disconnect()
    }
  }

  /**
   * Wait for the sound to be either loaded or errored. If the sound is playing,
   * the promise will resolve when playing is either stopped or finished.
   */
  then<TResult1 = void, TResult2 = never>(
    onFulfilled?: (value: void) => TResult1 | PromiseLike<TResult1>,
    onRejected?: (error: any) => TResult2 | PromiseLike<TResult2>
  ): Promise<TResult1 | TResult2> {
    return new Promise((resolve, reject) => {
      const observer = observe(() => {
        const status = this.statusRef.value
        try {
          if (status === 'error') {
            observer.dispose()
            if (onRejected) {
              resolve(onRejected(this.error))
            } else {
              reject(this.error)
            }
          } else if (status === 'loaded') {
            observer.dispose()
            resolve(onFulfilled?.() as any)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  private load() {
    const src =
      this.src.find(src => {
        if (src.pathname.endsWith('.ogg')) return useOgg
        if (src.pathname.endsWith('.aac')) return useAac
      }) || this.src[0]

    fetch(src)
      .then(response => response.arrayBuffer())
      .then(data => audioContext.decodeAudioData(data))
      .then(
        buffer => {
          this.buffer = buffer
          this.statusRef.value = 'loaded'
        },
        error => {
          this.error = error
          this.statusRef.value = 'error'
        }
      )
  }

  private connect(
    startTime: number,
    stopTime: number,
    options: Howl.PlayOptions
  ) {
    if (globalMuted.peek()) {
      const mutedObserver = observe(globalMuted, muted => {
        if (!muted) {
          this.connect(startTime, stopTime, options)
          mutedObserver.dispose()
        }
      })
      this.disconnect = () => {
        this.disconnect = noop

        mutedObserver.dispose()
        resetHowl(this)
      }
      return
    }

    let volume = 0
    let fadeInStart = -1
    let fadeOutStart = -1
    let fadeInDuration = options.fade ?? 0

    const gain = new GainNode(audioContext)
    const gainObserver = observe(() => {
      if (Howl.muted) {
        this.disconnect()
      } else {
        let oldVolume = volume
        volume = computeVolume(this, options)

        const { currentTime } = audioContext
        if (fadeInDuration > 0) {
          if (fadeInStart === -1) {
            fadeInStart = currentTime
            setTimeout(() => {
              fadeInDuration = 0
            }, fadeInDuration)
          } else if (oldVolume > 0) {
            oldVolume = volume * (gain.gain.value / oldVolume)
          }

          gain.gain.setValueAtTime(oldVolume, currentTime)
          gain.gain.linearRampToValueAtTime(
            volume,
            fadeInStart + fadeInDuration / 1000
          )
        } else if (fadeOutStart === -1) {
          gain.gain.setValueAtTime(volume, currentTime)
        }
      }
    })

    // Once a sound starts fading out, its end is inevitable. In other words,
    // there is no way to reverse or undo the fade out.
    this.fadeOut = duration => {
      if (duration <= 0) {
        return this.disconnect()
      }

      this.statusRef.value = 'stopping'

      fadeOutStart = audioContext.currentTime
      gain.gain.setValueAtTime(gain.gain.value, fadeOutStart)
      gain.gain.linearRampToValueAtTime(0, fadeOutStart + duration)

      setTimeout(() => {
        this.disconnect()
      }, duration)
    }

    const source = audioContext.createBufferSource()
    source.buffer = this.buffer!
    if (options.loop ?? this.loop) {
      source.loop = true
      source.loopStart = startTime
      source.loopEnd = stopTime
    }

    this.disconnect = () => {
      this.disconnect = noop

      source.disconnect()
      source.stop()

      gain.disconnect()
      gainObserver.dispose()

      resetHowl(this)
    }

    gain.connect(audioContext.destination)
    source.connect(gain)

    source.start(0, startTime, source.loop ? 86400 : stopTime - startTime)
    source.onended = this.disconnect
  }
}

export interface Howl {
  /** @observable */
  status: Howl.Status
  /** @observable */
  maxVolume: number
  /**
   * For sprites, the `muted` property is shared between all instances of the
   * same sound file.
   * @observable
   */
  muted: boolean
}

export declare namespace Howl {
  type Status = 'loading' | 'loaded' | 'playing' | 'stopping' | 'error'

  interface Options<Sprite extends string | null = any> {
    src: string | string[]
    /**
     * Sprites are a way to play a specific part of an audio file. The object
     * keys are the names, and the values are arrays with start and end times.
     * Typically, you would generate a JSON file (with a tool like Audiosprite)
     * for your application to import.
     */
    sprite?: Record<Extract<Sprite, string>, number[]>
    /**
     * Set the default value for the `loop` option when `play` is called.
     * @default false
     */
    loop?: boolean
    /** @default 1 */
    maxVolume?: number
    /** @default false */
    muted?: boolean | ReadonlyRef<boolean>
  }

  interface PlayOptions {
    /**
     * The number of milliseconds for the sound to fade from silent to the
     * `volume` option or `maxVolume` property.
     * @default 0
     */
    fade?: number
    /**
     * When true, the sound repeats once it finishes. If the user hasn't
     * interacted with the page yet, the sound will wait for the first
     * interaction and start playing then.
     * @default false
     */
    loop?: boolean
    /**
     * The volume the sound is played at. Note that this value is multiplied by
     * the `maxVolume` property.
     * @default 1
     */
    volume?: number
  }
}

function checkAudioType(type: string) {
  const audio = new Audio()
  const result: string = audio.canPlayType(type)
  return result !== '' && result !== 'no'
}

function createSourceURL(src: string) {
  return new URL(src, location.href)
}

function observeFirstInteraction() {
  let effects: (() => void)[] = []

  const events = ['click', 'keydown', 'touchend']
  const options = { once: true, passive: true }

  const run = () => {
    for (const event of events) {
      document.removeEventListener(event, run, options as EventListenerOptions)
    }
    effects.forEach(effect => effect())
    effects = null!
  }

  for (const event of events) {
    document.addEventListener(event, run, options)
  }

  return (effect: () => void) => {
    effects ? effects.push(effect) : effect()
  }
}

function computeVolume(howl: Howl, options: Howl.PlayOptions) {
  if (howl.muted) {
    return 0
  }
  return (options.volume ?? 1) * howl.maxVolume * Howl.volume
}

function resetHowl(howl: Howl) {
  howl.statusRef.value = 'loaded'
  runningHowls.delete(howl)
  suspendAudioContext()
}

/**
 * Safari may interrupt the audio context and use the non-standard 'interrupted'
 * state to signal this.
 */
function isInterrupted() {
  return audioContext.state === ('interrupted' as any)
}

function resumeAudioContext() {
  const contextStatus = contextStatusRef.peek()
  const interrupted = isInterrupted()

  let preventAutoSuspend = false
  if (contextStatus == ContextStatus.Running && !interrupted) {
    preventAutoSuspend = true
  } else if (
    contextStatus == ContextStatus.Suspended ||
    contextStatus == ContextStatus.RunOnceSuspended ||
    (contextStatus == ContextStatus.Running && interrupted)
  ) {
    preventAutoSuspend = true
    audioContext.resume().then(() => {
      contextStatusRef.value = ContextStatus.Running
    })
  } else if (contextStatus == ContextStatus.Suspending) {
    contextStatusRef.value = ContextStatus.RunOnceSuspended
  }
  if (preventAutoSuspend) {
    clearTimeout(contextSuspendTimer)
    contextSuspendTimer = undefined
  }
}

function suspendAudioContext() {
  if (runningHowls.size > 0) return
  if (contextSuspendTimer) return

  contextSuspendTimer = setTimeout(async () => {
    contextStatusRef.value = ContextStatus.Suspending
    contextSuspendTimer = undefined

    try {
      await audioContext.suspend()
    } catch (error) {
      console.error(error)
    }

    const contextStatus = contextStatusRef.peek()
    if (contextStatus === ContextStatus.RunOnceSuspended) {
      resumeAudioContext()
    } else {
      contextStatusRef.value = ContextStatus.Suspended
    }
  }, 30e3)
}
