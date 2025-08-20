import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import http from "http";
// import dotenv from "dotenv";
import connectDB from "./config/db.js";
const notificationRoutes = require('./routes/notificationRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
import { setupSocket } from "./socket.js";
// import dotenv from "dotenv";
// dotenv.config({ path: '../shared-config/.env' });

// dotenv.config();

const app = express();
const server = http.createServer(app);
const io = setupSocket(server);

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  req.io = io;
  next();
});

connectDB();

// Routes
app.use('/notifications', notificationRoutes);
app.use('/preferences', preferenceRoutes);

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// ✅ Start Express server
const port = process.env.COMMENT_PORT || 3001;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
