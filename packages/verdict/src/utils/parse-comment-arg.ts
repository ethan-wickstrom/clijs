import { isCommentSeverity } from "../record.js";
import type { ReviewComment } from "../record.js";

export const parseCommentArg = (raw: string): ReviewComment | null => {
  const parts = raw.split(":");
  if (parts.length < 4) return null;
  const [filePath, lineSpec, severityRaw, ...bodyParts] = parts;
  if (!filePath || !lineSpec || !severityRaw) return null;
  if (!isCommentSeverity(severityRaw)) return null;
  const [startRaw, endRaw] = lineSpec.split("-");
  const lineStart = Number(startRaw);
  if (!Number.isFinite(lineStart) || lineStart < 0) return null;
  const lineEnd = endRaw === undefined ? null : Number(endRaw);
  if (lineEnd !== null && (!Number.isFinite(lineEnd) || lineEnd < lineStart)) return null;
  const body = bodyParts.join(":").trim();
  if (body.length === 0) return null;
  return { filePath, lineStart, lineEnd, severity: severityRaw, body };
};
