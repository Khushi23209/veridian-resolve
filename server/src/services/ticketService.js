import tickets from "../data/tickets.json" with { type: "json" };

let ticketCounter = 1051;

export function getTickets() {
  return tickets;
}

export function getTicketById(id) {
  return tickets.find((ticket) => ticket.id === id) || null;
}

export function searchTickets(query = "") {
  const normalizedQuery = String(query).toLowerCase().trim();

  if (!normalizedQuery) {
    return tickets;
  }

  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  return tickets.filter((ticket) => {
    const text = JSON.stringify(ticket).toLowerCase();
    return words.some((word) => text.includes(word));
  });
}

export function createTicket(request, decision) {
  ticketCounter += 1;

  const ticket = {
    id: `TK-${ticketCounter}`,
    request_id: request.id,
    employee: request.employee,
    category: decision.category,
    status: decision.action === "ESCALATE" ? "Escalated" : "Open",
    action: decision.action,
    closed: false,
    created_at: new Date().toISOString()
  };

  tickets.push(ticket);

  return ticket;
}
