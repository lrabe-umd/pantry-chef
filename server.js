// server.js
// main entry point for the app

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

// bring in my routers
const ingredientsRouter = require("./routes/ingredients");
const savedRouter = require("./routes/saved");

const app = express();
const PORT = process.env.PORT || 3000;

// needed to parse json bodies and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files (css, client js) from the public folder
app.use(express.static(path.join(__dirname, "public")));

// /api/ingredients handles searching themealdb
// /api/saved handles saving/deleting recipes from mongodb
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/saved", savedRouter);

// serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// connect to mongodb before starting the server
// learned the hard way that starting the server first causes issues
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("connected to mongodb");
    app.listen(PORT, () => {
      console.log("server running on http://localhost:" + PORT);
    });
  })
  .catch((err) => {
    console.error("mongodb connection failed:", err);
    process.exit(1);
  });
