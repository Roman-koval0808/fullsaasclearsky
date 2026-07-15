// Transaction status — the job-fulfillment gap Barry's story formalized
// (clearsky-job-fulfillment-workflow.md). None of this exists in the current
// Action/signal library: no "supplier delivery received" trigger (#37), no
// "job completed" event (#38), no "collect a payment against a balance" (#39),
// and no open/closed transaction status at all (#40). We model the state
// machine and tag every step as a gap.

import type { GapHit } from "../gaps.js";

export type TxStatus = "open" | "closed";

export class Transaction {
  status: TxStatus = "open";
  private installed = false;
  private balanceCleared = false;
  readonly gaps: GapHit[] = [];

  constructor(readonly total: number, private deposit: number) {}

  get balanceDue(): number {
    return this.balanceCleared ? 0 : this.total - this.deposit;
  }

  supplierDeliveryReceived(): void {
    this.gaps.push({ ref: "37", note: "no 'supplier delivery received' trigger exists — modeled here" });
  }

  jobCompleted(): void {
    this.installed = true;
    this.gaps.push({ ref: "38", note: "no 'job completed' event exists distinct from the opportunity log — modeled here" });
    this.tryClose();
  }

  collectBalance(): void {
    this.balanceCleared = true;
    this.gaps.push({ ref: "39", note: "no Action logs a payment against an existing balance — modeled here" });
    this.tryClose();
  }

  private tryClose(): void {
    if (this.installed && this.balanceCleared && this.status === "open") {
      this.status = "closed";
      this.gaps.push({ ref: "40", note: "no open/closed transaction status concept exists — closing it here is narrative, not a documented state" });
    }
  }
}
