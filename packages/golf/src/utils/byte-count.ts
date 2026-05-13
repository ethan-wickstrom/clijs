export const byteCount = (source: string): number => {
  const trimmed = source.replace(/\s+$/, "");
  return Buffer.byteLength(trimmed, "utf8");
};
