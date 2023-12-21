const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


// this is create for a new user schema 
const userSchema = new mongoose.Schema({
  name: { //user name 
    type: String,
    required: [true, "Please enter a name"],
  },
  //  avatar come from cloudinary and cloudinary need 2 thing --> 1.public_id & 2.url
  avatar: {
    public_id: String,
    url: String,
  },

  email: {
    type: String,
    required: [true, "Please enter an email"], // in require hear passed pop up massage 
    unique: [true, "Email already exists"],
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, //!  hear select false because when i access any user you show only name email and post don`t show any password of accessing new user .so the purpose of hide hear use false
  },

    // hear if any user show his won account to show all post & followers & following  then accessing all post & followers & following  using arr[] . in this arr store all 3`s data 
  posts: [ 
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post", // hear user see his won account and showing his won all post so refer from post schema . in this  schema store all user post from them shorted only his post and showing him
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

//  when every time save this schema then will be run the function 
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) { // hear fallow the method save that mean i enter name email and password and save then password will be hash BUT  if i change name and email then enter hit save at that time  password will be again hash but at that time i don`t change my password so need to save it . so to  avoided this bug i use if conduction which check every time password will be change or not if not then not needed hashing every time  
    this.password = await bcrypt.hash(this.password, 10); // hear this mean refer this userSchema and this.password mean trigger password object  which is exist  under this whole User schema  mean trigger the line 24-29 
  } 

  next(); // if upper fun have any  change then call the next fun or not any change so nothing 
});
      //   use this fun for match Password 
userSchema.methods.matchPassword = async function (password) { //hear passed password from backend\controllers\user.js\68  which may be comparable with bcrypt-ed password
  return await bcrypt.compare(password, this.password);
}; // hear this.password is bcrypt-ed password

//  for crate a twt token so use this generateToken method come from --> backend\controllers\user.js\77
userSchema.methods.generateToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET);// using  jwt.sign --> generate a new token. next passed  mongo db _id  which is this _id  to store it on _id , latter when i decoded the token then search _id abd access  the real  mongodb._id  , next passed a secret key 
};





//* flow ==> getResetPasswordToken this method  crate a new token by using crypto . now store this new generated token in db under the users .  using this method which i generated token i send it on email . now my handler check both token are same or not . if same then access to reset password 

// 1st generate token line 76 , then hash this token and store it on db line 81-88 
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex"); // send this token in email
  // console.log(resetToken);

  // ! using this. i access all schema like this.name i access name of this schema same thing occur hear this.resetPasswordToken
  //* i make it more hash and store in db with time expire . to store it on db via line 52,53
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;


  return resetToken;
};


module.exports = mongoose.model("User", userSchema);


