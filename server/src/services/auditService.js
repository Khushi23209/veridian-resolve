const auditRecords = [];

export function addAuditRecord(record) {
  const audit = {
    id: `AUD-${auditRecords.length + 1}`,
    timestamp: new Date().toISOString(),
    ...record
  };

  auditRecords.push(audit);
  return audit;
}

export function getAuditRecords() {
  return auditRecords;
}
