import policies from "../data/policies.json" with { type: "json" };

export function getPolicies() {
  return policies;
}

export function getPolicyById(id) {
  return policies.find((policy) => policy.id === id) || null;
}

export function searchPolicies(query = "") {
  const normalizedQuery = String(query).toLowerCase().trim();

  if (!normalizedQuery) {
    return policies;
  }

  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  return policies.filter((policy) => {
    const text = JSON.stringify(policy).toLowerCase();
    return words.some((word) => text.includes(word));
  });
}
