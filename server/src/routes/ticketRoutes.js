import express from "express";
import { getTickets } from "../services/ticketService.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getTickets());
});

export default router;
