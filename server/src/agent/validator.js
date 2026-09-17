const VALID_ACTIONS = [
  "RESOLVE",
  "FOLLOW UP",
  "ESCALATE",
  "APPROVAL REQUIRED",
  "CLARIFY"
];

export function validateDecision(decision) {
  if (!decision || typeof decision !== "object") return false;
  if (!decision.category) return false;
  if (!VALID_ACTIONS.includes(decision.action)) return false;
  if (typeof decision.response !== "string") return false;
  if (!Array.isArray(decision.policy_ids)) return false;
  if (!Array.isArray(decision.historical_ticket_ids)) return false;
  if (typeof decision.policy_interaction !== "string") return false;
  if (typeof decision.createTicket !== "boolean") return false;

  return true;
}
