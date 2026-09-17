import express from "express";
import requests from "../data/requests.json" with { type: "json" };
import { analyzeRequest } from "../agent/agent.js";

const router = express.Router();

router.post("/analyze", async (req, res) => {
  try {
    let request = null;

    if (req.body.requestId) {
      request = requests.find(
        (item) => item.id === req.body.requestId
      );
    }

    if (!request && req.body.request) {
      request = req.body.request;
    }

    if (!request) {
      return res.status(400).json({
        error: "requestId or request is required"
      });
    }

    const conversation = Array.isArray(req.body.conversation)
      ? req.body.conversation
      : [];

    const result = await analyzeRequest(request, conversation);
    res.json(result);
  } catch (error) {
    console.error("Agent error:", error);

    res.status(500).json({
      error: "Agent failed to analyze request",
      details: error.message
    });
  }
});

export default router;
