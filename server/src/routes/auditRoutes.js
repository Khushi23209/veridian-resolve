import express from "express";
import { getAuditRecords } from "../services/auditService.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getAuditRecords());
});

export default router;
