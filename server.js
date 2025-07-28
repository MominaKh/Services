import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import http from "http";
// import dotenv from "dotenv";
import passport from "./config/passport.js";
import authRoute from "./routes/authRoutes.js";
import profileRoute from "./routes/profileRoutes.js";
import commentRoute from "./routes/commentRoutes.js";
import connectDB from "./config/db.js";
import { setupSocket } from "./socket.js";

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
app.use(passport.initialize());

// Routes
app.use("/auth", authRoute);
app.use("/profile", profileRoute);
app.use("/comment", commentRoute);

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// ✅ Start Express server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
