import { createInterface } from "node:readline";

export interface LineReader {
  next: () => Promise<string | null>;
  close: () => void;
}

export const createLineReader = (input: NodeJS.ReadableStream): LineReader => {
  const pending: string[] = [];
  const waiters: Array<(line: string | null) => void> = [];
  let closed = false;
  const rl = createInterface({ input, terminal: false });
  rl.on("line", (line: string) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else pending.push(line);
  });
  rl.on("close", () => {
    closed = true;
    while (waiters.length > 0) {
      const waiter = waiters.shift();
      waiter?.(null);
    }
  });
  return {
    next: () => {
      if (pending.length > 0) return Promise.resolve(pending.shift() ?? null);
      if (closed) return Promise.resolve(null);
      return new Promise<string | null>((resolveCall) => waiters.push(resolveCall));
    },
    close: () => rl.close(),
  };
};
