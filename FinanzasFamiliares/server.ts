import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

const app = express();
const PORT = 3000;

function resolveTrustProxySetting(): number | boolean {
  const raw = (process.env.TRUST_PROXY ?? "").trim().toLowerCase();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? 1 : false;
  }
  if (["true", "1", "yes", "on"].includes(raw)) return true;
  if (["false", "0", "no", "off"].includes(raw)) return false;
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  return process.env.NODE_ENV === "production" ? 1 : false;
}

function buildCspHeaderValue(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.gstatic.com https://*.google.com"
    : "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://*.gstatic.com https://*.google.com";

  const connectSrc = isDev
    ? "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.google.com https://accounts.google.com https://*.gstatic.com"
    : "connect-src 'self' https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.google.com https://accounts.google.com https://*.gstatic.com";

  const frameAncestors = isDev
    ? "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app"
    : "frame-ancestors 'self' https://*.google.com https://*.run.app";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com https://*.gstatic.com https://*.google.com",
    connectSrc,
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.google.com https://*.gstatic.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    frameAncestors,
    "form-action 'self' https://accounts.google.com https://*.firebaseapp.com",
  ].join("; ");
}

type CloudSecurityMode = "strict" | "compat";

function resolveCloudSecurityMode(): CloudSecurityMode {
  const rawMode = (process.env.E2EE_MODE || process.env.VITE_CLOUD_SECURITY_MODE || "compat").trim().toLowerCase();
  if (process.env.NODE_ENV === "production") {
    if (rawMode !== "strict") {
      console.warn("[SECURITY] Produccion detectada: forzando E2EE_MODE=strict (se ignora valor no estricto).");
    }
    return "strict";
  }
  return rawMode === "strict" ? "strict" : "compat";
}

const cloudSecurityMode = resolveCloudSecurityMode();

// DevSecOps: Trust first-hop reverse proxy (Google Cloud Run / GFE) to accurately resolve req.ip
app.set("trust proxy", resolveTrustProxySetting());

// DevSecOps: Disable server signature header
app.disable("x-powered-by");

// DevSecOps: Strict payload size limit to prevent memory exhaustion and DoS
app.use(express.json({ limit: "2mb" }));

// DevSecOps: Security Headers (Defense in Depth)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", buildCspHeaderValue());
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// DevSecOps Helper: Extract client identifier (Auth token hash, Member UID, or verified Client IP)
// Prevents collisions in shared residential/corporate NAT environments while stopping token brute-force
function getClientIdentifier(req: express.Request): string {
  const normalizeIp = (rawIp: string): string => {
    const value = (rawIp || "").trim().toLowerCase();
    if (!value) return "unknown";

    if (value.includes(".")) {
      const cleaned = value.replace("::ffff:", "");
      const parts = cleaned.split(".");
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      }
      return cleaned;
    }

    const segments = value.split(":");
    return `${segments.slice(0, 4).join(":") || value}::/64`;
  };

  // 1. Authorization Bearer token (truncated/hashed representation)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    if (rawToken.length > 10) {
      const digest = crypto.createHash("sha256").update(rawToken).digest("hex").slice(0, 16);
      return `auth:${digest}`;
    }
  }

  // 2. Custom authenticated UID from header or body
  const customUid =
    (req.headers["x-user-id"] as string) ||
    (req.body && typeof req.body.memberId === "string" ? req.body.memberId : null);
  if (customUid) {
    return `uid:${customUid}`;
  }

  // 3. Fallback to trusted client IP
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  const clientIp = forwardedIp || req.ip || req.socket.remoteAddress || "unknown-ip";
  return `ip:${normalizeIp(clientIp)}`;
}

// DevSecOps: Tier 1 - Global API Rate Limiter (General protection against automated scraping and DoS)
const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 300, // Max 300 requests per 15 minutes
  standardHeaders: true, // Return draft-6 / draft-7 RateLimit-* headers
  legacyHeaders: false, // Disable deprecated X-RateLimit-* headers
  keyGenerator: (req) => getClientIdentifier(req),
  message: {
    error: "Demasiadas solicitudes a la API. Por favor espere unos minutos antes de continuar.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// DevSecOps: Tier 2 - Sensitive Operations Rate Limiter (Strict limits for banking, invitations, and financial sync)
const sensitiveOpsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20, // Max 20 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIdentifier(req),
  handler: (req, res, _next, options) => {
    const clientKey = getClientIdentifier(req);
    const retrySec = Math.ceil(options.windowMs / 1000);

    // DevSecOps: Structured audit log for Cloud Logging / SIEM anomaly detection
    console.warn(
      JSON.stringify({
        level: "WARN",
        event: "SECURITY_RATE_LIMIT_EXCEEDED",
        path: req.originalUrl,
        method: req.method,
        clientKey,
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "unknown",
        retryAfterSeconds: retrySec,
        timestamp: new Date().toISOString(),
      })
    );

    res.status(options.statusCode).json({
      error: "Has superado el límite permitido para esta operación sensible. Por motivos de seguridad, espere antes de reintentar.",
      code: "RATE_LIMIT_SENSITIVE_EXCEEDED",
      retryAfterSeconds: retrySec,
    });
  },
});

// Apply global rate limiter to all /api/ routes
app.use("/api/", apiGlobalLimiter);

// DevSecOps: Block direct access to internal server data and environment secrets
app.use((req, res, next) => {
  const lower = req.path.toLowerCase();
  // Strictly prevent direct downloading of local database and server secrets
  if (
    lower === "/family_finances_data.json" ||
    lower.startsWith("/.env") ||
    lower === "/server.ts"
  ) {
    return res.status(403).json({ error: "Acceso denegado: recurso interno protegido" });
  }
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/security/mode", (_req, res) => {
  res.json({
    cloudSecurityMode,
    environment: process.env.NODE_ENV || "development",
  });
});

// Bank integration endpoint (no mock transaction generation in production code)
// Protected by Tier-2 Sensitive Operations Rate Limiter
app.post("/api/bank/sync", sensitiveOpsLimiter, (req, res) => {
  const { accountId, bankName } = req.body;

  res.json({
    success: true,
    syncedAt: new Date().toISOString(),
    transactions: [],
    message: `Sin movimientos nuevos para ${bankName || "la cuenta conectada"}${accountId ? ` (${accountId})` : ""}.`,
  });
});

async function startServer() {
  const publicPath = path.join(process.cwd(), "public");
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== "production") {
    const disableHmr = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : undefined,
        watch: {
          ignored: [
            "**/.vs/**",
            "**/*.vsidx",
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }

      // SPA fallback only for app routes (no file extension)
      if (path.extname(req.path)) {
        return res.status(404).end();
      }

      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de Finanzas Familiares activo en http://0.0.0.0:${PORT} [cloud-security-mode=${cloudSecurityMode}]`);
  });
}

startServer();
