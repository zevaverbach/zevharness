// Smooths bursty stream deltas into an even typewriter flow.
// Upstream delivers ~5-8 deltas per ~170ms burst; drain the backlog at a
// steady tick, faster when backlog grows so we never lag far behind.
const TICK_MS = 8;
const TARGET_LAG_TICKS = 12; // aim to clear backlog in ~100ms

export function createSmoothWriter(write: (s: string) => void = (s) => process.stdout.write(s)) {
  let queue: string[] = []; // code points, so we never split a surrogate pair
  let timer: NodeJS.Timeout | null = null;
  let onDrained: (() => void) | null = null;

  function tick() {
    if (queue.length === 0) {
      clearInterval(timer!);
      timer = null;
      onDrained?.();
      onDrained = null;
      return;
    }
    const n = Math.max(1, Math.ceil(queue.length / TARGET_LAG_TICKS));
    write(queue.splice(0, n).join(""));
  }

  return {
    print(text: string) {
      queue.push(...Array.from(text));
      timer ??= setInterval(tick, TICK_MS);
    },
    // resolves once everything queued has been written
    flush(): Promise<void> {
      if (queue.length === 0) return Promise.resolve();
      return new Promise((resolve) => (onDrained = resolve));
    },
  };
}
