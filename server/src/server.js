import dotenv from "dotenv";

dotenv.config();

const { default: express } = await import("express");
const { default: cors } = await import("cors");

const { default: agentRoutes } = await import("./routes/agentRoutes.js");
const { default: requestRoutes } = await import("./routes/requestRoutes.js");
const { default: ticketRoutes } = await import("./routes/ticketRoutes.js");
const { default: policyRoutes } = await import("./routes/policyRoutes.js");
const { default: auditRoutes } = await import("./routes/auditRoutes.js");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Veridian Resolve",
    status: "online"
  });
});

app.use("/api/agent", agentRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/audit", auditRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Veridian Resolve server running on http://localhost:${PORT}`);
});
