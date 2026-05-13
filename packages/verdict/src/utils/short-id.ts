import { randomBytes } from "node:crypto";

export const shortId = (bytes: number = 6): string => randomBytes(bytes).toString("hex");
