/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __DEEPSEEK_KEY__: string;
declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(options?: {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (swUrl: string, r: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }): {
    needRefresh: [boolean, (v: boolean) => void]
    offlineReady: [boolean, (v: boolean) => void]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
