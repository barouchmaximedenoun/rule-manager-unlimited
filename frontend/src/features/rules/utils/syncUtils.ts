import type { Dispatch, SetStateAction } from "react";

export async function runWithSync<T>(
  setSyncing: Dispatch<SetStateAction<boolean>> | ((val: boolean) => void),
  fn: () => Promise<T>
): Promise<{ result?: T; error?: Error | null }> {
  setSyncing(true);
  try {
    const result = await fn();
    return { result };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    return { error };
  } finally {
    setSyncing(false);
  }
}