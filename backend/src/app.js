const express = require("express");
const authRoutes = require("./routes/auth.routes");
const deviceRoutes = require("./routes/devices.routes");
const responsibleRoutes = require("./routes/responsible.routes");
const linkCodeRoutes = require("./routes/linkCodes.routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", authRoutes);
app.use("/api/responsible-profile", responsibleRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/link-codes", linkCodeRoutes);
app.use(errorHandler);

module.exports = app;
