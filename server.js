const express = require("express");
const cors = require("cors");
require("dotenv").config();
const passport = require("./config/passport");
const authRoute = require("./routes/authRoutes.js");
const profileRoute = require("./routes/profileRoutes.js");
const connectDB = require("./config/db.js");

const app = express();

app.use(express.json());
app.use(cors());

connectDB();
app.use(passport.initialize());

// Routes
app.use("/auth", authRoute);
app.use('/profile', profileRoute);

app.get("/", (req, res) => {
    res.send("Server running successfully");
});

// ✅ Start Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});


