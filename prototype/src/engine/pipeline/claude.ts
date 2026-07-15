// Real, response-cached AI Analysis Engine (locked decision, 2026-07-06).
//
// The pipeline's AnalysisEngine.analyze() is synchronous, so this engine reads
// from an on-disk cache synchronously. An async prewarm() step populates that
// cache by calling Claude (claude-opus-4-8) with structured output. The CLI
// prewarms every journey transcript before running; tests never touch this
// engine (they use the deterministic StubAnalysisEngine), so the suite stays
// hermetic and offline.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { AiAnalysis, AnalysisContext, AnalysisEngine } from "./analysis.js";
import { StubAnalysisEngine } from "./analysis.js";

const MODEL = "claude-opus-4-8"; // per claude-api skill: default unless told otherwise

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sentiment: { type: "string", enum: ["negative", "neutral", "positive", "ambiguous"] },
    urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
    emergency: { type: "boolean" },
    emergencyType: { type: "string" },
    opportunity: { type: "string", enum: ["none", "low", "medium", "high"] },
    momentum: { type: "string", enum: ["passive", "interested", "ready_to_book"] },
    risk: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
  },
  required: ["sentiment", "urgency", "emergency", "emergencyType", "opportunity", "momentum", "risk", "summary"],
} as const;

const SYSTEM = `You are the ClearSky AI Analysis Engine. Classify a customer's message or call transcript across six locked dimensions. Emergency detection rule (A2P spec §5.4): a phrase like "no hot water" alone is NOT an emergency — it needs an explicit trigger word (emergency/fire/flooding/gas smell/no heat), a listed condition (burst pipe, sewage backup, gas leak, electrical fire/shock), or extreme-cold context. emergencyType always carries a value even when emergency is false. Respond only with the structured object.`;

export class CachedClaudeAnalysisEngine implements AnalysisEngine {
  private cacheDir: string;
  private fallback = new StubAnalysisEngine();
  private client: Anthropic | null;

  constructor(cacheDir = join(process.cwd(), ".cache", "analysis")) {
    this.cacheDir = cacheDir;
    mkdirSync(this.cacheDir, { recursive: true });
    this.client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  }

  /** Synchronous cache read; falls back to the deterministic stub on a miss. */
  analyze(text: string, ctx: AnalysisContext): AiAnalysis {
    const path = this.pathFor(text, ctx);
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as AiAnalysis;
    return this.fallback.analyze(text, ctx); // miss → deterministic stub
  }

  /** Populate the cache for every text up front, via one real Claude call each. */
  async prewarm(items: Array<{ text: string; ctx: AnalysisContext }>): Promise<void> {
    if (!this.client) return; // no key → analyze() will use the stub
    for (const { text, ctx } of items) {
      const path = this.pathFor(text, ctx);
      if (existsSync(path)) continue;
      const analysis = await this.callClaude(text, ctx);
      writeFileSync(path, JSON.stringify(analysis, null, 2));
    }
  }

  private async callClaude(text: string, ctx: AnalysisContext): Promise<AiAnalysis> {
    const res = await this.client!.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
      messages: [
        { role: "user", content: `New customer: ${ctx.isNewCustomer}\n\nMessage/transcript:\n${text}` },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("no text block in Claude response");
    return JSON.parse(block.text) as AiAnalysis;
  }

  private pathFor(text: string, ctx: AnalysisContext): string {
    const key = createHash("sha256").update(`${ctx.isNewCustomer}::${text}`).digest("hex").slice(0, 32);
    return join(this.cacheDir, `${key}.json`);
  }
}
