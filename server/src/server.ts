import './env.js';
import express from "express";
import cors from "cors";
import { bountiesRouter } from './routes/bounties.js';


const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    if (!process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use(express.json());
app.use('/api/bounties', bountiesRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "BountyBoard API is running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "BountyBoard API",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "BountyBoard API",
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 BountyBoard API running on http://${HOST}:${PORT}`);
});