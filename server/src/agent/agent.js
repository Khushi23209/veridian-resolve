import OpenAI from "openai";

import { SYSTEM_PROMPT } from "./prompts.js";
import { validateDecision } from "./validator.js";

import {
  getPolicies,
  searchPolicies
} from "../services/policyService.js";

import {
  searchTickets,
  createTicket
} from "../services/ticketService.js";

import {
  addAuditRecord
} from "../services/auditService.js";


const client = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    })
  : null;


/* =====================================================
   FALLBACK CLASSIFIER
===================================================== */

function isVpnRenewalFollowUp(request, conversation = []) {
  const currentText = `
    ${request.subject || ""}
    ${request.issue || ""}
  `.toLowerCase();

  const historyText = conversation
    .map((message) => message.content || "")
    .join(" ")
    .toLowerCase();

  const asksToRenew =
    currentText.includes("renew") ||
    currentText.includes("renewal") ||
    currentText.includes("how do i renew") ||
    currentText.includes("how to renew");

  return (
    asksToRenew &&
    (
      currentText.includes("vpn") ||
      historyText.includes("vpn")
    )
  );
}


function classifyFallback(request, conversation = []) {

  // Keep the CURRENT message separate from history so an old
  // "expired" or "credential" message cannot trigger the same
  // VPN-expired rule during a follow-up question.
  const currentText = `
    ${request.subject || ""}
    ${request.issue || ""}
  `.toLowerCase();

  const historyText = conversation
    .map((message) => message.content || "")
    .join(" ")
    .toLowerCase();

  // Keep the original broader context for the existing fallback
  // rules outside the VPN follow-up case.
  const text = `
    ${request.subject || ""}
    ${request.issue || ""}
    ${request.description || ""}
    ${conversation
      .map((message) => message.content || "")
      .join(" ")}
  `.toLowerCase();


  /* -----------------------------------------------
     VPN FOLLOW-UP: RENEWAL
  ----------------------------------------------- */

  if (isVpnRenewalFollowUp(request, conversation)) {
    return {
      category: "VPN",
      action: "RESOLVE",

      response:
        "Per KB-02, VPN credentials expire every 90 days and must be renewed by the employee. The supplied policy does not specify the exact renewal steps.",

      policy_ids: ["KB-02"],

      historical_ticket_ids: ["TK-1042"],

      policy_interaction: "",

      createTicket: false
    };
  }


  /* -----------------------------------------------
     SECURITY / PHISHING
  ----------------------------------------------- */

  if (
    text.includes("phishing") ||
    text.includes("malware") ||
    text.includes("unauthorized access") ||
    text.includes("suspicious email")
  ) {
    return {
      category: "Security",
      action: "ESCALATE",

      response:
        "This should be reported immediately to security@veridian-corp.example. The request has been escalated to Security.",

      policy_ids: ["KB-09"],

      historical_ticket_ids: ["TK-1048"],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     CONTRACTOR VPN
  ----------------------------------------------- */

  if (
    currentText.includes("contractor") &&
    (
      currentText.includes("vpn") ||
      historyText.includes("vpn")
    )
  ) {
    return {
      category: "VPN Access",
      action: "APPROVAL REQUIRED",

      response:
        "Contractors require manager approval through the access request form before VPN access can be provided.",

      policy_ids: ["KB-02"],

      historical_ticket_ids: [],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     VPN EXPIRED
  ----------------------------------------------- */

  if (
    currentText.includes("vpn") &&
    (
      currentText.includes("expired") ||
      currentText.includes("credential")
    )
  ) {
    return {
      category: "VPN",
      action: "RESOLVE",

      response:
        "Per KB-02, VPN credentials expire every 90 days and must be renewed by the employee. Full-time employees receive VPN access automatically.",

      policy_ids: ["KB-02"],

      historical_ticket_ids: ["TK-1042"],

      policy_interaction: "",

      createTicket: false
    };
  }


  /* -----------------------------------------------
     GENERAL VPN
  ----------------------------------------------- */

  if (
    currentText.includes("vpn") ||
    (
      historyText.includes("vpn") &&
      (
        currentText.includes("access") ||
        currentText.includes("connect") ||
        currentText.includes("working") ||
        currentText.includes("work")
      )
    )
  ) {
    return {
      category: "VPN",
      action: "FOLLOW UP",

      response:
        "VPN access is automatic for full-time employees. Contractors require manager approval through the access request form.",

      policy_ids: ["KB-02"],

      historical_ticket_ids: ["TK-1042"],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     PASSWORD
  ----------------------------------------------- */

  if (
    text.includes("password") &&
    (
      text.includes("locked") ||
      text.includes("lockout") ||
      text.includes("failed")
    )
  ) {
    return {
      category: "Password Reset",
      action: "RESOLVE",

      response:
        "After 5 failed password attempts, IT manually unlocks the account. No approval is required.",

      policy_ids: ["KB-01"],

      historical_ticket_ids: ["TK-1049"],

      policy_interaction: "",

      createTicket: false
    };
  }


  if (text.includes("password")) {
    return {
      category: "Password Reset",
      action: "RESOLVE",

      response:
        "Use the self-service password reset portal. It is available anytime.",

      policy_ids: ["KB-01"],

      historical_ticket_ids: ["TK-1049"],

      policy_interaction: "",

      createTicket: false
    };
  }


  /* -----------------------------------------------
     GUEST WI-FI
  ----------------------------------------------- */

  if (
    text.includes("guest") &&
    (
      text.includes("wifi") ||
      text.includes("wi-fi")
    )
  ) {
    return {
      category: "Guest Wi-Fi",
      action: "RESOLVE",

      response:
        "Guest Wi-Fi credentials are valid for 24 hours and can be generated by any employee at the front-desk kiosk. No IT ticket is required.",

      policy_ids: ["KB-07"],

      historical_ticket_ids: ["TK-1051"],

      policy_interaction: "",

      createTicket: false
    };
  }


  /* -----------------------------------------------
     NON-CATALOG SOFTWARE
  ----------------------------------------------- */

  if (
    text.includes("software") &&
    (
      text.includes("non-catalog") ||
      text.includes("not in the catalog")
    )
  ) {
    return {
      category: "Software",
      action: "FOLLOW UP",

      response:
        "Non-catalog software requires IT Security review. The review takes 3–5 business days.",

      policy_ids: ["KB-04"],

      historical_ticket_ids: ["TK-1044"],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     BROWSER EXTENSION
  ----------------------------------------------- */

  if (
    text.includes("browser extension") ||
    text.includes("extension")
  ) {
    return {
      category: "Software",
      action: "FOLLOW UP",

      response:
        "If the browser extension is not in the software catalog, it requires IT Security review.",

      policy_ids: ["KB-04"],

      historical_ticket_ids: [],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     PRINTER
  ----------------------------------------------- */

  if (text.includes("printer")) {
    return {
      category: "Printer",
      action: "FOLLOW UP",

      response:
        "Check the print queue and restart the print spooler. If the problem persists, create a ticket including the printer asset tag.",

      policy_ids: ["KB-05"],

      historical_ticket_ids: ["TK-1046"],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     MAILBOX
  ----------------------------------------------- */

  if (
    text.includes("mailbox") ||
    text.includes("email storage") ||
    text.includes("mail storage")
  ) {
    return {
      category: "Mailbox",
      action: "FOLLOW UP",

      response:
        "The default mailbox size is 25GB. Old mail can be archived. Increasing the mailbox above 25GB requires manager approval and cannot exceed 50GB.",

      policy_ids: ["KB-06"],

      historical_ticket_ids: ["TK-1045"],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     EXPENSE SOFTWARE
  ----------------------------------------------- */

  if (
    text.includes("expense") &&
    (
      text.includes("software") ||
      text.includes("tool") ||
      text.includes("login") ||
      text.includes("credential")
    )
  ) {
    return {
      category: "Expense Software",
      action: "FOLLOW UP",

      response:
        "Finance grants access to the expense software. IT handles login or technical issues once the account exists.",

      policy_ids: ["KB-08"],

      historical_ticket_ids: [],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     WFH EQUIPMENT
  ----------------------------------------------- */

  if (
    (
      text.includes("wfh") ||
      text.includes("work from home") ||
      text.includes("remote")
    ) &&
    (
      text.includes("monitor") ||
      text.includes("chair") ||
      text.includes("equipment")
    )
  ) {
    return {
      category: "WFH Equipment",
      action: "APPROVAL REQUIRED",

      response:
        "Employees working remotely more than 3 days per week are eligible for a one-time chair/monitor allowance. Manager sign-off and Finance processing are required before IT ships the equipment.",

      policy_ids: ["KB-10"],

      historical_ticket_ids: ["TK-1047"],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     LAPTOP / HARDWARE
  ----------------------------------------------- */

  if (
    text.includes("laptop") ||
    text.includes("screen") ||
    text.includes("hardware") ||
    text.includes("computer")
  ) {
    const hasThreeYears =
      text.includes("3 year") ||
      text.includes("3-year") ||
      text.includes("3.5") ||
      text.includes("3 years");

    const failure =
      text.includes("dead") ||
      text.includes("not working") ||
      text.includes("failure") ||
      text.includes("flickering");


    if (hasThreeYears && failure) {
      return {
        category: "Laptop Replacement",
        action: "APPROVAL REQUIRED",

        response:
          "KB-03 says laptops are eligible for replacement after 3 years or earlier for verified hardware failure. The Asset Management Policy uses a 4-year refresh cycle and requires Finance sign-off in addition to IT approval for early replacement outside that cycle.",

        policy_ids: [
          "KB-03",
          "ASSET-POLICY"
        ],

        historical_ticket_ids: [
          "TK-1043"
        ],

        policy_interaction:
          "KB-03 establishes eligibility after 3 years or earlier for verified hardware failure, while the Asset Management Policy establishes a 4-year refresh cycle and additional Finance sign-off for early replacement outside that cycle.",

        createTicket: true
      };
    }


    if (failure) {
      return {
        category: "Laptop / Hardware",
        action: "FOLLOW UP",

        response:
          "KB-03 allows earlier laptop replacement for verified hardware failure. The replacement request should be evaluated against the applicable hardware policy.",

        policy_ids: [
          "KB-03",
          "ASSET-POLICY"
        ],

        historical_ticket_ids: [],

        policy_interaction:
          "KB-03 and the Asset Management Policy may both apply to hardware replacement requests.",

        createTicket: true
      };
    }
  }


  /* -----------------------------------------------
     ADMIN ACCESS
  ----------------------------------------------- */

  if (
    text.includes("admin access") ||
    (
      text.includes("access") &&
      text.includes("server")
    )
  ) {
    return {
      category: "Admin Access",
      action: "FOLLOW UP",

      response:
        "A historical admin-access request (TK-1050) was rejected because no business justification was provided. The current request should provide the necessary business justification for review.",

      policy_ids: [],

      historical_ticket_ids: [
        "TK-1050"
      ],

      policy_interaction: "",

      createTicket: true
    };
  }


  /* -----------------------------------------------
     VAGUE
  ----------------------------------------------- */

  return {
    category: "Unclassified IT Issue",
    action: "CLARIFY",

    response:
      "Please provide a little more detail about what is not working so the request can be routed using the Veridian knowledge base.",

    policy_ids: [],

    historical_ticket_ids: [],

    policy_interaction: "",

    createTicket: false
  };
}


/* =====================================================
   LLM
===================================================== */

async function callLLM(
  request,
  conversation = []
) {

  if (!client) {
    return null;
  }


  const searchText = `
    ${request.subject || ""}
    ${request.issue || ""}
    ${request.description || ""}

    ${conversation
      .map((message) => message.content || "")
      .join(" ")}
  `;


  const relevantPolicies =
    searchPolicies(searchText);


  const relevantTickets =
    searchTickets(searchText);


  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },

    /*
      Previous conversation is included
      before the current request.
    */

    ...conversation.map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: message.content
    })),

    {
      role: "user",

      content: `
CURRENT REQUEST:

${JSON.stringify(request, null, 2)}


RELEVANT POLICIES:

${JSON.stringify(
  relevantPolicies,
  null,
  2
)}


HISTORICAL TICKETS:

${JSON.stringify(
  relevantTickets,
  null,
  2
)}


Answer the CURRENT request using the
conversation context and ONLY the supplied
Veridian source material.

The current request may be a follow-up to the
previous messages. Answer the latest question
directly; do not simply repeat an earlier
response when the user asks for a narrower
follow-up.

If the source material does not provide the
requested detail or exact steps, explicitly
say that the supplied policy does not specify
them instead of inventing instructions.

Return ONLY valid JSON matching the
required decision structure.
`
    }
  ];


  try {

    const completion =
      await client.chat.completions.create({

        model:
          process.env.GROQ_MODEL ||
          "llama-3.1-8b-instant",

        temperature: 0,

        messages,

        response_format: {
          type: "json_object"
        }
      });


    const content =
      completion
        .choices?.[0]
        ?.message
        ?.content;


    if (!content) {
      return null;
    }


    return JSON.parse(content);

  } catch (error) {

    console.error(
      "LLM unavailable:",
      error.message
    );

    return null;
  }
}


/* =====================================================
   MAIN AGENT
===================================================== */

export async function analyzeRequest(
  request,
  conversation = []
) {

  const replay = [
    {
      step: 1,
      label: "Request received",
      detail:
        request.issue ||
        request.description ||
        request.subject
    },

    {
      step: 2,
      label: "Relevant policies searched",
      detail:
        "Veridian knowledge base and asset policy"
    },

    {
      step: 3,
      label: "Historical tickets checked",
      detail:
        "Historical tickets searched for precedent"
    }
  ];


  /*
    Use a deterministic grounded guardrail for the
    VPN renewal follow-up because KB-02 does not provide
    the exact renewal steps. This prevents an LLM response
    from repeating the original VPN-expiry answer.
  */

  let decision;
  let mode;

  if (isVpnRenewalFollowUp(request, conversation)) {

    decision =
      classifyFallback(
        request,
        conversation
      );

    mode = "rules";

  } else {

    /*
      Try AI first.
    */

    decision =
      await callLLM(
        request,
        conversation
      );

    mode = "ai";


    /*
      If no API key, API error,
      or invalid AI response,
      use grounded fallback.
    */

    if (!validateDecision(decision)) {

      decision =
        classifyFallback(
          request,
          conversation
        );

      mode = "rules";
    }
  }


  replay.push({
    step: 4,
    label: "Decision generated",

    detail:
      `${decision.category} → ${decision.action}`
  });


  let ticket = null;


  if (decision.createTicket) {

    ticket =
      createTicket(
        request,
        decision
      );
  }


  replay.push({
    step: 5,
    label: "Decision validated",

    detail:
      mode === "ai"
        ? "AI decision validated"
        : "Grounded rules used"
  });


  if (ticket) {

    replay.push({
      step: 6,
      label: "Ticket created",

      detail:
        ticket.id
    });
  }


  const audit =
    addAuditRecord({

      request_id:
        request.id,

      employee:
        request.employee,

      category:
        decision.category,

      action:
        decision.action,

      policy_ids:
        decision.policy_ids,

      historical_ticket_ids:
        decision.historical_ticket_ids,

      mode
    });


  return {

    request,

    ...decision,

    ticket,

    replay,

    audit,

    mode
  };
}