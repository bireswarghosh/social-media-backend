const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.isAuthenticated = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({
        message: "Please login first",
      });
    }
          //  using .verify method i decoded the token for access mongodb._id 
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);// jwt.verify --> for decoded , then passed JWT_SECRET key now collecting this all data complect the jwt token
            

    // using req.user i access all data of user  and hear i store user id in this req.user
    req.user = await User.findById(decoded._id); // find the  id from the token .   this  id store in req.user and access this  req.user._id  to backend\controllers\post.js\17 

    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
