import "./src/env.js";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./src/api/auth.routes.js";
import profileRoutes from "./src/api/profile.routes.js";
import taskRoutes from "./src/api/tasks.routes.js";
import walletRoutes from "./src/api/wallet.routes.js";
import chatRoutes from "./src/api/chat.routes.js";
import usersRoutes from "./src/api/users.routes.js";
import adminRoutes from "./src/api/admin.routes.js";
import disputesRoutes from "./src/api/disputes.routes.js";
import notificationsRoutes from "./src/api/notifications.routes.js";
import kycRoutes from "./src/api/kyc.routes.js";
import webhooksRoutes from "./src/api/webhooks.routes.js";
import dashboardRoutes from "./src/api/dashboard.routes.js";
import cooperativesRoutes from "./src/api/cooperatives.routes.js";
import societiesRoutes from "./src/api/societies.routes.js";
import membershipsRoutes from "./src/api/memberships.routes.js";
import categoriesRoutes from "./src/api/categories.routes.js";
import servicesRoutes from "./src/api/services.routes.js";
import aiRoutes from "./src/api/ai.routes.js";
import intelligenceRoutes from "./src/api/intelligence.routes.js";
import certificationsRoutes from "./src/api/certifications.routes.js";
import { welfareRoutes } from "./src/api/welfare.routes.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { startBackgroundJobs } from "./src/jobs/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

startBackgroundJobs();

const app = express();
app.set("trust proxy", 1);

// Webhooks need raw body, so place BEFORE express.json()
app.use("/api/webhooks", webhooksRoutes);

app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/disputes", disputesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cooperatives", cooperativesRoutes);
app.use("/api/societies", societiesRoutes);
app.use("/api/memberships", membershipsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/certifications", certificationsRoutes);
app.use("/api/welfare", welfareRoutes);

app.get("/api/geocode", async (req, res) => {
  try {
    const { place_id, latlng } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
    let url = `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}`;
    if (place_id) {
      url += `&place_id=${place_id}`;
    } else if (latlng) {
      url += `&latlng=${latlng}`;
    } else {
      return res.status(400).json({ error: "Missing place_id or latlng" });
    }
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Geocoding proxy error:", error);
    res.status(500).json({ error: "Geocoding failed" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve frontend depending on environment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "public")));
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 0 }
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// Global error handler for Prisma P2025 OCC failures and general errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === "P2025" || (err.message && err.message.includes("P2025"))) {
    return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
  }
  console.error("GLOBAL Unhandled error:", err, err.stack);
  res.status(500).json({ error: "Internal server error: " + String(err) });
});

app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () => {
  console.log(`Server listening on ${process.env.PORT || 3000}`);
});
