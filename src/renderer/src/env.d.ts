import type { RadarApi } from '../../shared/ipc'

declare global {
  interface Window {
    readonly radar: RadarApi
  }
}

export {}
