import express from "express";
import requests from "../data/requests.json" with { type: "json" };

const router = express.Router();

router.get("/", (req, res) => {
  res.json(requests);
});

router.get("/:id", (req, res) => {
  const request = requests.find((item) => item.id === req.params.id);

  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  res.json(request);
});

export default router;
