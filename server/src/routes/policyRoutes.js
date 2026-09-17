import express from "express";
import {
  getPolicies,
  searchPolicies
} from "../services/policyService.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getPolicies());
});

router.get("/search", (req, res) => {
  res.json(searchPolicies(req.query.q || ""));
});

export default router;
