// AI Analysis Engine — the six locked dimensions the Orchestrator reads
// (A2P Developer Spec §5.1). Phase 2 ships a deterministic, rules-based stub that
// implements the §5.4 emergency-detection logic; Phase 3 swaps in a real,
// response-cached Claude implementation behind the same interface (decision
// locked 2026-07-06: real Claude, cached).

export type Sentiment = "negative" | "neutral" | "positive" | "ambiguous";
export type Urgency = "low" | "medium" | "high" | "critical";
export type Opportunity = "none" | "low" | "medium" | "high";
export type Momentum = "passive" | "interested" | "ready_to_book";
export type Risk = "low" | "medium" | "high";

export interface AiAnalysis {
  sentiment: Sentiment;
  urgency: Urgency;
  emergency: boolean;
  /** Always populated, even when emergency = false (locked 2026-07-05). */
  emergencyType: string;
  opportunity: Opportunity;
  momentum: Momentum;
  risk: Risk;
  summary: string;
}

export interface AnalysisContext {
  /** True when no prior hub profile existed before this contact. */
  isNewCustomer: boolean;
}

export interface AnalysisEngine {
  analyze(text: string, ctx: AnalysisContext): AiAnalysis;
}

const TRIGGER_WORDS = ["emergency", "fire", "flooding", "gas smell", "no heat"];
const EMERGENCY_CONDITIONS: Array<[RegExp, string]> = [
  [/burst pipe|pipe burst/i, "burst_pipe"],
  [/sewage|sewer back/i, "sewage_backup"],
  [/gas leak|smell.*gas/i, "gas_leak"],
  [/electrical fire|shock/i, "electrical_fire_or_shock"],
];

/**
 * Rules-based analyzer matching the spec's emergency-detection precedent
 * (§5.4): a keyword like "no hot water" alone is NOT an emergency — it needs an
 * explicit trigger word, a listed condition, or extreme-cold context.
 */
export class StubAnalysisEngine implements AnalysisEngine {
  analyze(text: string, ctx: AnalysisContext): AiAnalysis {
    const t = text.toLowerCase();

    let emergencyType = "general";
    let emergency = false;
    for (const [re, type] of EMERGENCY_CONDITIONS) {
      if (re.test(t)) {
        emergency = true;
        emergencyType = type;
        break;
      }
    }
    const extremeCold = /-\s?\d{2}|freezing|extreme cold/.test(t);
    if (!emergency && TRIGGER_WORDS.some((w) => t.includes(w))) {
      emergency = true;
      if (t.includes("no heat")) emergencyType = "no_heat";
    }
    if (!emergency && /no hot water/.test(t)) {
      emergencyType = "no_hot_water";
      if (extremeCold) emergency = true; // "no hot water AND -30°C" would qualify
    }

    const wantsCallNow = /right away|call me|call now|as soon|asap|come out|book/i.test(t);
    const urgent = /right away|now|asap|urgent|no hot water|no heat|today/i.test(t);
    const urgency: Urgency = emergency ? "critical" : urgent ? "high" : "medium";

    const negative = /angry|terrible|unhappy|frustrat|worst|refund|cancel/i.test(t);
    const positive = /great|thanks|thank you|fantastic|happy/i.test(t);
    const sentiment: Sentiment = negative ? "negative" : positive ? "positive" : "ambiguous";

    const risk: Risk = /cancel|refund|switch|competitor/i.test(t) ? "high" : "low";
    const opportunity: Opportunity = ctx.isNewCustomer ? "high" : "medium";
    const momentum: Momentum = wantsCallNow ? "ready_to_book" : "interested";

    return {
      sentiment,
      urgency,
      emergency,
      emergencyType,
      opportunity,
      momentum,
      risk,
      summary: text.trim(),
    };
  }
}
