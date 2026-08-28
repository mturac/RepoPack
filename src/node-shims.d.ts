declare module "node:crypto" {
  export function createHash(algorithm: string): { update(data: string | Uint8Array): any; digest(encoding: "hex"): string };
}
declare module "node:fs" {
  export interface Stats { isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean; size: number; }
}
declare module "node:fs/promises" {
  export function readFile(path: string | URL, options?: string | { encoding?: string }): Promise<any>;
  export function writeFile(path: string | URL, data: string | Uint8Array, options?: any): Promise<void>;
  export function rename(oldPath: string | URL, newPath: string | URL): Promise<void>;
  export function mkdir(path: string | URL, options?: any): Promise<void>;
  export function readdir(path: string | URL, options?: any): Promise<any[]>;
  export function lstat(path: string | URL): Promise<import("node:fs").Stats>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function rm(path: string | URL, options?: any): Promise<void>;
}
declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function dirname(path: string): string;
  export function basename(path: string): string;
  export function extname(path: string): string;
  export function join(...paths: string[]): string;
  export function normalize(path: string): string;
  export const sep: string;
  export const posix: { normalize(path: string): string; dirname(path: string): string; join(...paths: string[]): string; extname(path: string): string };
}
declare module "node:child_process" {
  export interface SpawnSyncReturns<T> { status: number | null; stdout: T; stderr: T; error?: Error; }
  export function spawnSync(command: string, args?: string[], options?: any): SpawnSyncReturns<string>;
}
declare module "node:os" { export function tmpdir(): string; }
declare var process: { argv: string[]; cwd(): string; stdout: { write(value: string): void }; stderr: { write(value: string): void }; exitCode?: number; execPath: string; env: Record<string, string | undefined> };
declare class Buffer extends Uint8Array {
  static from(value: string | number[] | Uint8Array, encoding?: string): Buffer;
  static byteLength(value: string, encoding?: string): number;
  includes(value: number): boolean;
  toString(encoding?: string): string;
}
