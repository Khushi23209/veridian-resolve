import { useEffect, useMemo, useState } from "react";

import {
  Bot,
  ClipboardList,
  Database,
  FileSearch,
  History,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  User
} from "lucide-react";

import {
  analyzeCustomRequest,
  analyzeRequest,
  getAudit,
  getPolicies,
  getRequests,
  getTickets
} from "./services/api";

const NAV = [
  ["chat", "Agent Chat", Bot],
  ["triage", "Batch Triage", ClipboardList],
  ["kb", "Knowledge Base", Database],
  ["audit", "Audit Trail", History]
];

function App() {
  const [view, setView] = useState("chat");

  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [audit, setAudit] = useState([]);

  const [selectedId, setSelectedId] = useState("REQ-05");
  const [issue, setIssue] = useState("");
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [batch, setBatch] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [requestData, ticketData, policyData, auditData] =
          await Promise.all([
            getRequests(),
            getTickets(),
            getPolicies(),
            getAudit()
          ]);

        setRequests(requestData);
        setTickets(ticketData);
        setPolicies(policyData);
        setAudit(auditData);

        const defaultRequest = requestData.find(
          (request) => request.id === "REQ-05"
        );

        if (defaultRequest) {
          setIssue(defaultRequest.issue);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }

    loadData();
  }, []);

  const selected = requests.find(
    (request) => request.id === selectedId
  );

  function handleSampleChange(event) {
    const value = event.target.value;

    setMessages([]);
    setResult(null);

    if (value === "CUSTOM") {
      setSelectedId("");
      setIssue("");
      return;
    }

    const request = requests.find(
      (item) => item.id === value
    );

    setSelectedId(value);
    setIssue(request?.issue || "");
  }

  async function runAgent() {
    const text = issue.trim();

    if (!text || loading) {
      return;
    }

    // Send only the messages that happened BEFORE the current user message.
    // The backend receives the current request separately.
    const conversation = messages.map((message) => ({
      role: message.role === "agent" ? "assistant" : "user",
      content: message.content
    }));

    const userMessage = {
      role: "user",
      content: text
    };

    setMessages((current) => [...current, userMessage]);
    setIssue("");
    setLoading(true);

    try {
      let data;

      const isFirstMessageForSample =
        Boolean(selected) &&
        selected.issue?.trim() === text &&
        messages.length === 0;

      if (isFirstMessageForSample) {
        // First turn: analyze the supplied assignment request directly.
        data = await analyzeRequest(selected.id, conversation);
      } else if (selected) {
        // Follow-up: keep the original request identity/employee, but use
        // the user's latest message as the current issue. This is what lets
        // questions such as "How do I renew?" stay in the VPN context.
        const historyText = conversation
          .map((message) =>
            `${message.role}: ${message.content}`
          )
          .join("\n");

        const contextualRequest = {
          ...selected,
          // Preserve the original request identity and subject so the
          // evidence search stays anchored to the assignment case.
          issue: text,
          subject: selected.subject || selected.issue,
          description: [
            selected.description || selected.issue,
            historyText
              ? `Conversation context:\n${historyText}`
              : ""
          ]
            .filter(Boolean)
            .join("\n\n")
        };

        data = await analyzeCustomRequest(
          contextualRequest,
          conversation
        );
      } else {
        // Custom issue: create a temporary request for this conversation.
        const customRequest = {
          id: `CUSTOM-${Date.now()}`,
          employee: "Demo User",
          email: "demo@veridian-corp.example",
          date: "Demo",
          issue: text,
          subject: text,
          description: text,
          initialAction: "Not started"
        };

        data = await analyzeCustomRequest(
          customRequest,
          conversation
        );
      }

      setResult(data);

      const responseText =
        data?.response ||
        data?.decision?.message ||
        "The request has been analyzed.";

      setMessages((current) => [
        ...current,
        {
          role: "agent",
          content: responseText
        }
      ]);

      setTickets(await getTickets());
      setAudit(await getAudit());
    } catch (error) {
      console.error("Agent error:", error);

      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "I could not connect to the IT support backend.";

      setMessages((current) => [
        ...current,
        {
          role: "agent",
          content: errorMessage
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runBatch() {
    setLoading(true);
    setBatch([]);

    try {
      const results = [];

      for (const request of requests) {
        const response = await analyzeRequest(request.id, []);
        results.push(response);
      }

      setBatch(results);
      setTickets(await getTickets());
      setAudit(await getAudit());
    } catch (error) {
      console.error("Batch triage error:", error);
      alert("Batch triage failed.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const open = tickets.filter(
      (ticket) =>
        !ticket.closed &&
        !String(ticket.status).startsWith("Resolved")
    ).length;

    const resolved = tickets.filter(
      (ticket) =>
        ticket.closed &&
        String(ticket.status).includes("Resolved")
    ).length;

    const escalated = tickets.filter((ticket) =>
      String(ticket.status).includes("Escalated")
    ).length;

    return {
      total: tickets.length,
      open,
      resolved,
      escalated
    };
  }, [tickets]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">Veridian Corp</div>
          <div className="brand-sub">
            Resolve · Internal IT Agent
          </div>
        </div>

        <nav>
          {NAV.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? "nav active" : "nav"}
              onClick={() => setView(id)}
            >
              <Icon size={16} />
              <span>{label}</span>

              {id === "triage" && (
                <b>{requests.length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="side-note">
          <strong>Week of 21–25 Sep 2026</strong>
          <span>Grounded in supplied data pack</span>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <h1>
              {NAV.find((item) => item[0] === view)?.[1]}
            </h1>
            <span className="subtitle">
              Evidence-first IT support
            </span>
          </div>

          <div className="ai-pill">
            <span />
            Agent Online
          </div>
        </header>

        <section className="stats">
          <Stat label="Tickets" value={stats.total} />
          <Stat label="Open / Pending" value={stats.open} />
          <Stat label="Resolved" value={stats.resolved} />
          <Stat label="Escalated" value={stats.escalated} />
        </section>

        {view === "chat" && (
          <Chat
            requests={requests}
            selectedId={selectedId}
            issue={issue}
            setIssue={setIssue}
            handleSampleChange={handleSampleChange}
            messages={messages}
            result={result}
            loading={loading}
            runAgent={runAgent}
          />
        )}

        {view === "triage" && (
          <Triage
            batch={batch}
            requests={requests}
            loading={loading}
            runBatch={runBatch}
          />
        )}

        {view === "kb" && (
          <KB
            policies={policies}
            query={query}
            setQuery={setQuery}
          />
        )}

        {view === "audit" && (
          <Audit audit={audit} />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Chat({
  requests,
  selectedId,
  issue,
  setIssue,
  handleSampleChange,
  messages,
  result,
  loading,
  runAgent
}) {
  return (
    <div className="chat-layout">
      <section className="chat-card">
        <div className="chat-topbar">
          <div>
            <div className="chat-title">
              <Sparkles size={15} />
              Ask Veridian Resolve
            </div>

            <div className="chat-description">
              Describe any IT issue in your own words.
            </div>
          </div>

          <select
            value={selectedId || "CUSTOM"}
            onChange={handleSampleChange}
            className="sample-select"
          >
            <option value="CUSTOM">
              + Custom issue
            </option>

            <optgroup label="Assignment Requests">
              {requests.map((request) => (
                <option
                  key={request.id}
                  value={request.id}
                >
                  {request.employee} · {request.id}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="conversation">
          {!messages.length && !result && (
            <div className="empty">
              <Bot size={34} />
              <h3>How can I help?</h3>
              <p>
                Select a sample request above or type
                your own IT issue below.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "message-row user-row"
                  : "message-row"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "chat-avatar user-avatar"
                    : "chat-avatar"
                }
              >
                {message.role === "user" ? (
                  <User size={14} />
                ) : (
                  <Bot size={14} />
                )}
              </div>

              <div className="bubble">
                <span className="bubble-label">
                  {message.role === "user"
                    ? "You"
                    : "Veridian Resolve"}
                </span>
                <p>{message.content}</p>
              </div>
            </div>
          ))}

          {result && <Result result={result} />}
        </div>

        <div className="composer">
          <textarea
            value={issue}
            onChange={(event) =>
              setIssue(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                runAgent();
              }
            }}
            placeholder="Describe your IT issue..."
            rows={3}
          />

          <div className="composer-bottom">
            <span>
              Enter to send · Shift + Enter for a new line
            </span>

            <button
              className="primary send-button"
              onClick={runAgent}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={16}
                    className="spin"
                  />
                  Investigating...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {result && <Replay result={result} />}
    </div>
  );
}

function Result({ result }) {
  const decision = result.decision || result;

  const category =
    decision.category || "IT Support";

  const action =
    decision.action || "FOLLOW UP";

  const message =
    decision.message ||
    decision.response ||
    "The request has been analyzed.";

  const followUp =
    decision.followUp ||
    decision.follow_up;

  const sources =
    decision.sources ||
    decision.policy_ids ||
    [];

  const precedent =
    decision.precedent ||
    decision.historical_ticket_ids ||
    [];

  const policyInteraction =
    decision.conflictDetail ||
    decision.policy_interaction ||
    "";

  return (
    <div className="result">
      <div className="result-head">
        <div>
          <span className="eyebrow">
            AGENT DECISION
          </span>
          <h2>{category}</h2>
        </div>

        <span className={`action ${action}`}>
          {action}
        </span>
      </div>

      <div className="message">
        {message}
      </div>

      {followUp && (
        <div className="follow">
          <strong>Follow-up</strong>
          <p>{followUp}</p>
        </div>
      )}

      <div className="evidence-grid">
        <div>
          <label>Policy evidence</label>
          <div className="chips">
            {sources.length ? (
              sources.map((source) => (
                <span key={source}>{source}</span>
              ))
            ) : (
              <em>None</em>
            )}
          </div>
        </div>

        <div>
          <label>Historical precedent</label>
          <div className="chips">
            {precedent.length ? (
              precedent.map((source) => (
                <span key={source}>{source}</span>
              ))
            ) : (
              <em>None used</em>
            )}
          </div>
        </div>
      </div>

      {policyInteraction && (
        <div className="conflict">
          <ShieldAlert size={19} />
          <div>
            <strong>
              Policy interaction detected
            </strong>
            <p>{policyInteraction}</p>
          </div>
        </div>
      )}

      {result.ticket && (
        <div className="ticket">
          <div>
            <span>Ticket created</span>
            <strong>{result.ticket.id}</strong>
          </div>
          <span>{result.ticket.status}</span>
        </div>
      )}

      <div className="mode">
        Decision mode: <b>{result.mode || "rules"}</b>
      </div>
    </div>
  );
}

function Replay({ result }) {
  return (
    <aside className="replay">
      <div className="replay-title">
        <FileSearch size={17} />
        Agent Replay
      </div>

      {(result.replay || []).map((step, index) => (
        <div
          className="replay-step"
          key={`${step.step}-${index}`}
        >
          <div className="step-dot">
            {index + 1}
          </div>

          <div>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </div>
        </div>
      ))}
    </aside>
  );
}

function Triage({
  batch,
  requests,
  loading,
  runBatch
}) {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Batch Triage</h2>
          <p>
            Process all {requests.length} supplied
            employee requests through the same
            evidence-first agent.
          </p>
        </div>

        <button
          className="primary"
          onClick={runBatch}
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : "Run Batch Triage"}
        </button>
      </div>

      {!batch.length ? (
        <div className="empty large">
          <ClipboardList size={38} />
          <h3>No batch run yet</h3>
          <p>
            Run the batch to create an auditable
            decision set for all requests.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Action</th>
                <th>Evidence</th>
                <th>Ticket</th>
              </tr>
            </thead>

            <tbody>
              {batch.map((item) => {
                const decision =
                  item.decision || item;

                const sources =
                  decision.sources ||
                  decision.policy_ids ||
                  [];

                return (
                  <tr key={item.request.id}>
                    <td>
                      <b>{item.request.id}</b>
                    </td>
                    <td>{item.request.employee}</td>
                    <td>{decision.category}</td>
                    <td>
                      <span
                        className={`action ${decision.action}`}
                      >
                        {decision.action}
                      </span>
                    </td>
                    <td>
                      {sources.join(", ") || "—"}
                    </td>
                    <td>
                      {item.ticket?.id || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function KB({ policies, query, setQuery }) {
  const filtered = policies.filter((policy) =>
    `${policy.id} ${policy.title} ${policy.text}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Knowledge Base</h2>
          <p>
            Source-of-truth policies supplied
            for the assignment.
          </p>
        </div>

        <div className="search">
          <Search size={16} />
          <input
            placeholder="Search policies..."
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </div>
      </div>

      <div className="kb-grid">
        {filtered.map((policy) => (
          <article
            className="kb-card"
            key={policy.id}
          >
            <span>{policy.id}</span>
            <h3>{policy.title}</h3>
            <p>{policy.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Audit({ audit }) {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Audit Trail</h2>
          <p>
            Observable actions produced by the agent.
          </p>
        </div>
      </div>

      {!audit.length ? (
        <div className="empty large">
          <History size={38} />
          <h3>No actions yet</h3>
          <p>
            Run the agent to populate the audit trail.
          </p>
        </div>
      ) : (
        <div className="audit">
          {audit.map((item) => {
            const requestId =
              item.request_id || item.requestId;

            const sources =
              item.policy_ids ||
              item.sources ||
              [];

            return (
              <div
                className="audit-row"
                key={item.id}
              >
                <time>
                  {new Date(
                    item.timestamp
                  ).toLocaleTimeString()}
                </time>

                <div>
                  <strong>
                    {requestId} · {item.action}
                  </strong>

                  <p>
                    {item.category} · {sources.join(", ") || "No policy source"}
                  </p>
                </div>

                <small>{item.mode}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default App;
