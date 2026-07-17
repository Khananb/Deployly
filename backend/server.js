require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
    process.exit(1);
}

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const profileRoutes = require("./routes/profileRoutes");
const domainRoutes = require("./routes/domainRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
const databaseRoutes = require("./routes/databaseRoutes");
const deploymentRoutes = require("./routes/deploymentRoutes");
const healthRoutes = require("./routes/healthRoutes");
const billingRoutes = require("./routes/billingRoutes");
const planRoutes = require("./routes/planRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const runBillingCron = require("./cron/billingCron");

const app = express();
app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx) to correctly resolve client IP

// Security and utility middleware
app.use(helmet());
app.use(cors());

const { requestLogger } = require("./utils/logger");
app.use(requestLogger);

app.use(express.json());

// Global Rate Limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: { success: false, message: "Too many requests from this IP, please try again later" }
});
app.use("/api/", globalLimiter);

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/websites", websiteRoutes);
app.use("/api/databases", databaseRoutes);
app.use("/api/deployments", deploymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/plans", planRoutes);
app.get("/", (req, res) => {
    res.json({
        name: "Deployly API",
        version: "1.0.0",
        status: "Running"
    });
});

// Static Website Hosting
const path = require("path");
app.use("/sites", express.static(path.join(__dirname, "../storage/sites"), {
    index: ['index.html']
}));

// Error handling middleware
app.use(errorMiddleware);

const runSSLCron = require("./cron/sslCron");

// Start Cron Jobs
runBillingCron();
runSSLCron();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
