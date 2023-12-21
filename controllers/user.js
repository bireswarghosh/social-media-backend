const User = require("../models/User");
const Post = require("../models/Post");
const { sendEmail } = require("../middlewares/sendEmail");
const crypto = require("crypto");
const cloudinary = require("cloudinary");


exports.register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body; // accept this dat from req.body .

    // 1st search user via email 
    let user = await User.findOne({ email });
    if (user) { // if exist 
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    //  upload img for avatar . upload img in cloudinary folder: "avatars
    const myCloud = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatars",
    });

      // if user not exist then crate a new user  
    user = await User.create({
      name,
      email,
      password,
      avatar: { public_id: myCloud.public_id, url: myCloud.secure_url }, // it`s  set new user avatar via  public_id and url  come form cloudinary
    });
  // ! when user register at the same time user are login mean at the same time token will be crated 
    const token = await user.generateToken();
 
    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    res.status(201).cookie("token", token, options).json({ // statusCode--> (201) === crate some thing 
      success: true,
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select("+password")
      .populate("posts followers following"); //! if i log out then log in --> in redux state --> show LoadUserFailure . if LoadUserFailure then not store any user fowler and fowling data only present user id but in Dialog box i show user avatar , name so to fix it ==>> but when log in then show on state LoginSuccess . so go login backend go to  backend\controllers\user.js\59  and .populate("posts followers following"); all details and access all data in LoginSuccess state 

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist",
      });
    }

    const isMatch = await user.matchPassword(password); // this .matchPassword  fun  occur in backend\models\User.js\65  . user.matchPassword --> it check enter  password === bcrypt password which user enter when user register 

    if (!isMatch) { // if not match then show err massage 
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const token = await user.generateToken();

    const options = { // hear passed when cookie will be expires after90 day
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
      //  hear if successfully received token then passed this token in the cookie by using this --> .cookie("token", token). ok first "token" mean which is in under the qtauction mean this is cookie name and 2nd token is passes the real token  which given by line 77.  with passed options come from line  79-81 
    res.status(200).cookie("token", token, options).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", null, { expires: new Date(Date.now()), httpOnly: true }) //in log out if token is present under the cookie then null the token and expires it now as soon as possible 
      .json({
        success: true,
        message: "Logged out",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.followUser = async (req, res) => {
  try { // find that  user which you want to follow
    const userToFollow = await User.findById(req.params.id);// finding by id 
    const loggedInUser = await User.findById(req.user._id); // find my self via id 

    if (!userToFollow) { // if your following user id is wrong then show this err massage 
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    //  ! bug++ ==> if one user  follow one celebrate the celebrate followers arr have same user  multiple times and  any user following arr one celebrate have  multiple times.                           //* fix ==> if one user  once exist this both arr so second times it works ir`s opposite beaver like if  follow then 2nd times un follow like in like and un like beaver
    if (loggedInUser.following.includes(userToFollow._id)) { // * if your  following arr already exist any celebrate/your following user id 
      const indexfollowing = loggedInUser.following.indexOf  (userToFollow._id);// * so find the id index 
      const indexfollowers = userToFollow.followers.indexOf(loggedInUser._id);

      loggedInUser.following.splice(indexfollowing, 1); //* and removed 
      userToFollow.followers.splice(indexfollowers, 1);
        //  then save all changes 
      await loggedInUser.save();
      await userToFollow.save();

      res.status(200).json({
        success: true,
        message: "User Unfollowed",
      });
    } else { // ! when you are following any user there are 2 step --> 1. push your favorite user id  in your  following arr and 2nd one is push you won id in you favorite user followers arr 
      loggedInUser.following.push(userToFollow._id); // hear push your favorite user id in your following arr . and hear you follow a celebrate
      userToFollow.followers.push(loggedInUser._id); // hear push your id  in your favorite user followers arr . that mean you are the followers for any celebrate

      await loggedInUser.save();
      await userToFollow.save();

      res.status(200).json({
        success: true,
        message: "User followed",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");// select("+password") other wise not see password because in schema i use select flash mean password will be hided 

    const { oldPassword, newPassword } = req.body; // now received both password 

    if (!oldPassword || !newPassword) { // if any one not passed any password both of them  then show this err massage
      return res.status(400).json({
        success: false,
        message: "Please provide old and new password",
      });
    }

    const isMatch = await user.matchPassword(oldPassword); // hear matchPassword exist on schema and hear passed old password to check match or not    

    if (!isMatch) { 
      return res.status(400).json({
        success: false,
        message: "Incorrect Old password",
      });
    }

    user.password = newPassword;  // if old password match then then  save new password under the user.password 
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//  !  update profile 
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { name, email, avatar } = req.body;

    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }
      // if avatar already exist then first destroy next upload 
    if (avatar) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });
      user.avatar.public_id = myCloud.public_id;
      user.avatar.url = myCloud.secure_url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // i find user 

    // * before removed user 1st store  posts ,followers ,following ,and userId in a variable then using this variable i  clear all data of user 
    const posts = user.posts;  
    const followers = user.followers; 
    const following = user.following; 
    const userId = user._id; 

    // Removing Avatar from cloudinary
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    await user.remove(); 

    // Logout user after deleting profile
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });

    // Delete all posts of the user   //! if user delate his account so delate his/her all POST     . so deleting all Post i use an arr 
    for (let i = 0; i < posts.length; i++) {
      const post = await Post.findById(posts[i]); // using (posts[i]) --> access all element of arr by using arr of i / arr[i] of hear posts is arr where store all post
      await cloudinary.v2.uploader.destroy(post.image.public_id);
      await post.remove();
    }

    // Removing User from Followers Following
    for (let i = 0; i < followers.length; i++) {
      const follower = await User.findById(followers[i]);

      const index = follower.following.indexOf(userId); // remove my i id from  from Followers Following
      follower.following.splice(index, 1);
      await follower.save();
    }

    // Removing User from Following's Followers
    for (let i = 0; i < following.length; i++) {
      const follows = await User.findById(following[i]);

      const index = follows.followers.indexOf(userId);
      follows.followers.splice(index, 1);
      await follows.save();
    }

    // removing all comments of the user from all posts
    const allPosts = await Post.find(); // find full arr of post 

    for (let i = 0; i < allPosts.length; i++) { 
      const post = await Post.findById(allPosts[i]._id);  // find post  one by one  . first find one post via it`s id 

      for (let j = 0; j < post.comments.length; j++) { // now go to this post comments arr 
        if (post.comments[j].user === userId) { /// and match my/user id  if match comment
          post.comments.splice(j, 1);
        }
      }
      await post.save();
    }

    // removing all likes of the user from all posts
    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < post.likes.length; j++) {
        if (post.likes[j] === userId) {
          post.likes.splice(j, 1);
        }
      }
      await post.save();
    }

    res.status(200).json({
      success: true,
      message: "Profile Deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

    //  simply show my profile and it`s all details
exports.myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "posts followers following"
    ); // hear use populate means give me all details user  posts followers following arr .  and i see data 

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
 
  //  find any user via it`s id and show me  his all posts followers following 
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "posts followers following"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

  //  help to find how many user to their name via  $regex , it is use in -->frontend\src\Components\Search\Search.jsx
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      name: { $regex: req.query.name, $options: "i" }, // $regex have help me to find like --> if i search a then it give me all name about a , and next $options: "i" mean insensitive
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    //  when you forgot password then tell you first select email id  
    // so hear i find user via email (which email i received from req.body.email)
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // hear crete getResetPasswordToken method which come from --> backend\models\User.js\78-95,52,53
    const resetPasswordToken = user.getResetPasswordToken();

    await user.save(); // when generated token then store new hash token in db but after store save them so use this line 

    // req.protocol mean http// or https//  . next host mean hosted link .  next passed token which is passed in line 397 so in word --> http://localhost:8000/password/reset/resetPasswordToken
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/password/reset/${resetPasswordToken}`;

    const message = `Reset Your Password by clicking on the link below: \n\n ${resetUrl}`; // this is massage which send in email .  hear use \n\n mean 2 line break then show url 

    // now send email
    try {
      await sendEmail({  // this sendEmail com from backend\middlewares\sendEmail.js\all
        email: user.email, // send email which person -->  user.email
        subject: "Reset Password", // this is email subject
        message, // send email massage
      });

      // if email send then this success massage 
      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email}`,
      });

    //   if email not send then do this err work
    } catch (error) { // if email not send mean do not need save resetPasswordToken ,resetPasswordExpire in db so hear both of this are undefined
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save(); // save changes , mean no need any db work

      // so send this err massage 
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }


  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

 // this is reset Password
exports.resetPassword = async (req, res) => {
  try {// after successfully send mail , store resetPasswordToken , resetPasswordExpire in db . ok so when reset password then check match bth match or not , 
    const resetPasswordToken = crypto // hear i crate my new password  using same algorithm  so generate new password will be same , what is store in db so match them 
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({ // hear i found user via this 2 
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // hear $gt mean grater than Date.now() . hear in expire use grater than date.now because token validate is only 10 min , ok if i found user in this 10 minute so ok otherwise so err line 457-462
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid or has expired",
      });
    }

    user.password = req.body.password; // if i found user so, change password with which i received from req.body 

    //  when i change new password then clear resetPasswordExpire , resetPasswordToken  this 2 from db because no  need to carey it . so use undefined and clear it 
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save(); // and next save every thing 

    res.status(200).json({
      success: true,
      message: "Password Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// !  UNTIL THIS POINT I DO NOT ADD THIS 2
 
// this is my all post details
exports.getMyPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const posts = [];

    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner" // need owner avatar and comments.user name and avatar  in frontend\src\Components\Account\Account.jsx\71-73
      );
      posts.push(post);
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    const posts = [];

    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
