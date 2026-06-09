import { readFileSync } from "node:fs";
import path from "node:path";
import type { NodeV2Type } from "../../../shared/types.js";

const SKILLS_DIR = path.join(process.cwd(), "skills");
const cache = new Map<string, string>();

export function loadSkill(type: NodeV2Type): string {
  if (cache.has(type)) return cache.get(type)!;
  const filePath = path.join(SKILLS_DIR, `${type}.md`);
  try {
    const content = readFileSync(filePath, "utf-8").trim();
    cache.set(type, content);
    return content;
  } catch {
    throw new Error(`No skill file found for node type "${type}" at ${filePath}`);
  }
}
