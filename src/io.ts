import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, path);
}
