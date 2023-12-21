const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
if (process.env.NODE_ENV !== "production") {
  // IF in not production mode mean  only developer mode --> use dotenv file from this path  "backend/config/config.env"
  require("dotenv").config({ path: "config/config.env" });
}

// Using Middlewares .       //! if want to use req.body mean accept data from body  then use this 2 line  
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser()); // to access token from cookie then use cookieParser

// Importing Routes
const post = require("./routes/post");
const user = require("./routes/user");

// Using Routes
app.use("/api/v1", post);
app.use("/api/v1", user);

// app.use(express.static(path.join(__dirname, "../frontend/build")));

// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "../frontend/build/index.html"));
// });

module.exports = app;
