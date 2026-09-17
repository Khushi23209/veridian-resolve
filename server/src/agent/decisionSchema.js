export const decisionSchema = {
  type: "object",
  properties: {
    category: { type: "string" },
    action: {
      type: "string",
      enum: [
        "RESOLVE",
        "FOLLOW UP",
        "ESCALATE",
        "APPROVAL REQUIRED",
        "CLARIFY"
      ]
    },
    response: { type: "string" },
    policy_ids: {
      type: "array",
      items: { type: "string" }
    },
    historical_ticket_ids: {
      type: "array",
      items: { type: "string" }
    },
    policy_interaction: { type: "string" },
    createTicket: { type: "boolean" }
  },
  required: [
    "category",
    "action",
    "response",
    "policy_ids",
    "historical_ticket_ids",
    "policy_interaction",
    "createTicket"
  ]
};
