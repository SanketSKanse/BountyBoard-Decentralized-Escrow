import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { bountiesRouter } from './routes/bounties.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/bounties', bountiesRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "BountyBoard API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "BountyBoard API",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 BountyBoard API running on http://localhost:${PORT}`);
});