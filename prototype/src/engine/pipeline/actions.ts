// Action Library — A2P Developer Spec §6.5, plus the web/hub actions the journeys
// exercise. `owner` follows the locked Sarah/Bert split (approval routing by
// content type, not urgency): Sarah owns non-financial/non-technical content;
// Bert owns anything originating a price or technical judgment; `system` = no
// human. `proposed` marks Actions not yet in the locked library (tagged as gaps).

export type ExecutionMode = "automatic" | "draft";
export type Owner = "system" | "sarah" | "bert";

export interface ActionDef {
  id: string;
  name: string;
  mode: ExecutionMode;
  requiresApproval: boolean;
  owner: Owner;
  /** Sends to a public/external channel — subject to the no-auto-post safety rule. */
  postsExternally?: boolean;
  /** Not yet in the locked library; tag this tracker item when selected. */
  proposedGap?: string;
}

export const ACTIONS: Record<string, ActionDef> = {
  // ── A2P call actions (§6.5) ────────────────────────────────────────────────
  "ACT-CALL-001": { id: "ACT-CALL-001", name: "Create callback task", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-002": { id: "ACT-CALL-002", name: "Send urgent alert to team", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-003": { id: "ACT-CALL-003", name: "Create emergency dispatch alert", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-004": { id: "ACT-CALL-004", name: "Log opportunity to CRM", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-005": { id: "ACT-CALL-005", name: "Generate call-context summary (internal)", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-006": { id: "ACT-CALL-006", name: "Log complaint theme internally", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-007": { id: "ACT-CALL-007", name: "Flag churn risk in profile", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-CALL-008": { id: "ACT-CALL-008", name: "Send SMS follow-up (if opted in)", mode: "draft", requiresApproval: true, owner: "sarah" },

  // Callback acknowledgement — pre-approved template, fires without a per-send click
  // (locked). Consent basis still open → tag #30.
  "ACT-REPLY-001": { id: "ACT-REPLY-001", name: "Callback acknowledgement SMS (pre-approved template)", mode: "automatic", requiresApproval: false, owner: "system", proposedGap: "30" },

  // ── Review actions ─────────────────────────────────────────────────────────
  "ACT-REV-005": { id: "ACT-REV-005", name: "Mark testimonial candidate", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-REV-007": { id: "ACT-REV-007", name: "Create mismatch review draft", mode: "draft", requiresApproval: true, owner: "sarah", postsExternally: true },

  // ── Web / hub actions ──────────────────────────────────────────────────────
  "ACT-NURTURE-ENROLL": { id: "ACT-NURTURE-ENROLL", name: "Enroll in NurtureSequence", mode: "automatic", requiresApproval: false, owner: "system" },
  "ACT-PERSONALIZE": { id: "ACT-PERSONALIZE", name: "Site Personalization — select on-page content variant", mode: "automatic", requiresApproval: false, owner: "system" },

  // ── Generic fallback ───────────────────────────────────────────────────────
  "ACT-TASK-001": { id: "ACT-TASK-001", name: "Create internal task", mode: "automatic", requiresApproval: false, owner: "system" },
};

export function action(id: string): ActionDef {
  const a = ACTIONS[id];
  if (!a) throw new Error(`unknown action ${id}`);
  return a;
}
