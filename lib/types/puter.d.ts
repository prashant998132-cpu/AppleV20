// lib/types/puter.d.ts — Canonical Puter.js type declarations
// Single source of truth — imported by all files that use Puter

export interface PuterAI {
  chat: (prompt: any, options?: {
    model?: string
    stream?: boolean
    [key: string]: any
  }) => Promise<any>
  txt2speech: (text: string, options?: { voice?: string }) => Promise<string>
  txt2img: (prompt: string, options?: any) => Promise<{ src: string; url?: string }>
}

export interface PuterAuth {
  isSignedIn: () => boolean
  signIn: () => Promise<void>
  getUser: () => Promise<{ username: string }>
}

export interface PuterFS {
  write:   (path: string, data: Blob | string, opts?: { createMissingParents?: boolean; overwrite?: boolean }) => Promise<any>
  read:    (path: string) => Promise<Blob>
  delete:  (path: string, opts?: { recursive?: boolean }) => Promise<void>
  readdir: (path: string) => Promise<Array<{ name: string; is_dir: boolean; size: number }>>
  mkdir:   (path: string, opts?: { createMissingParents?: boolean }) => Promise<void>
  stat:    (path: string) => Promise<{ size: number; name: string }>
  move:    (from: string, to: string) => Promise<void>
}

export interface PuterKV {
  set:    (key: string, value: string) => Promise<void>
  get:    (key: string) => Promise<string | null>
  del:    (key: string) => Promise<void>
  list:   (pattern?: string) => Promise<Array<{ key: string; value: string }> | string[]>
  incr:   (key: string, amount?: number) => Promise<number>
  flush:  () => Promise<void>
}

export interface PuterSDK {
  ai:   PuterAI
  auth: PuterAuth
  fs:   PuterFS
  kv:   PuterKV
}

declare global {
  interface Window {
    puter?: PuterSDK
  }
}
