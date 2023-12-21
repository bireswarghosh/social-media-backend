const Post = require("../models/Post");
const User = require("../models/User");
const cloudinary = require("cloudinary");


exports.createPost = async (req, res) => {
  try {
    const myCloud = await cloudinary.v2.uploader.upload(req.body.image, { // req.body.image mute be --> which you passed in frontend mean in frontend i pass image as name of image hook  so i use hear req.body.image
      folder: "posts",
    });
    const newPostData = {
      caption: req.body.caption,
      image: { // this 2 give data of img
        public_id: myCloud.public_id,  // this 2 come from cloudinary 
        url: myCloud.secure_url,  // this 2 come from cloudinary
      },
      owner: req.user._id, //this  req.user._id come from  backend\middlewares\auth.js\18 and store it on owner
    };
     
             //  ↑↑using  this all line i full fill all condition of Post schema  

    // next new post crated
    const post = await Post.create(newPostData);  // crete a new post on Post schema 
           
    //find req.user._id  from User schema .          //* i find the user because  when  user show his won all post  then send the all post in an arr and this arr is exist on  --> backend\models\User.js\32  at there i save all post via line 29 
    const user = await User.findById(req.user._id); 

    // when user want see his won post then send all post of this user arr . use unshift for last comment show first
    user.posts.unshift(post._id); // this post come from line 21 . hear unshift an arr this arr is exist on --> backend\models\User.js\32 

    

    // now save all changes
    await user.save();
    res.status(201).json({ 
      success: true,
      message: "Post created",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePost = async (req, res) => {
  try {// 1st id find post id 
    const post = await Post.findById(req.params.id);
    //  if not found then show an err 
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
      // ! user can only delate  his won post so, match post.owner id === req.user._id (which he try to delate )   if both match then can be access to delate . for purpose of matching i convert both id into a string 
    if (post.owner.toString() !== req.user._id.toString()) { // * but hear passed not matched condection 
      return res.status(401).json({ // if fail to match so show this err massage 
        success: false,
        message: "Unauthorized",
      });
    }
    // ! after delete post destroy  img from cloudinary
    await cloudinary.v2.uploader.destroy(post.image.public_id);

    await post.remove(); // if matched both id then removed the post
        // !  after deleting the post,   removed the post  from  owner post arr 
    const user = await User.findById(req.user._id); // so find user , hear user is a owner id which come from  line 17

    const index = user.posts.indexOf(req.params.id); // then find index of post 
    user.posts.splice(index, 1); // and removed the post 

    await user.save(); // then save everything 

    res.status(200).json({ // show success massage 
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.likeAndUnlikePost = async (req, res) => {
  try { // hear like or unlike a post so, for this reason i need post  id which is exist on Post schema  and access the id i use req.params.id  
    const post = await Post.findById(req.params.id);

    // if post id  not found show err massage 
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

        //  if user already like , but how i know  that user already like or not --> so , if user id  already present in like arr that mean user already like of if  user id not present in like arr that mean until user unlike 
    if (post.likes.includes(req.user._id)) { // hear includes find in likes arr present user id if yes  
      const index = post.likes.indexOf(req.user._id); // then find the index which is matched of user id 

      //  hear splice method say delate only  1 index  
      post.likes.splice(index, 1); // and  delate this user index which come from 102   //  ! this is make for unlike so if user exist removed this user 

      await post.save();// then save the post 

      return res.status(200).json({
        success: true,
        message: "Post Unliked",
      });

      // ! to understand the flow ==> 1st if single click on like button then simply occur --> like fun(116-119) . and if double click then  occur unlike fun(101-107) removed this user.id from likes arr and then  this arr will be empty so not changes mean unlike   

    } else {  // ! this is for like 
      post.likes.push(req.user._id); // if user id is exit on likes arr then like 

      await post.save();

      return res.status(200).json({
        success: true,
        message: "Post Liked",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPostOfFollowing = async (req, res) => { //! hear i try to see all post of any user 
  try {
    const user = await User.findById(req.user._id);

    const posts = await Post.find({
      owner: {
        $in: user.following, // * hear i passed full arr of user following . and $in work is --> find the filed from total arr .  store in owner , user id from the arr of user.following . and ine 138 find the all post of this user id . basically , $in help me to find user from user.following arr , but when i select any user and want to see his all post that moment  automatically set new user id in owner arr 
      },
    }).populate("owner likes comments.user"); // frontend\src\Components\Home\Home.jsx\60-64      Hear need likes, comments, ownerImage, ownerName, ownerId so for this reason i populate this arr . //! when i populate then i get all data about which i populate . so mean without populate  i only get likes arr where put only id who like . but after  populate i get data of every user  mean who like i assume that , like a person who`s id 232 but when populate then i get all data like  name post basically this id`s account   . after get`s account of this id now i shorted what i need of this user like need only name and avatar 

    res.status(200).json({
      success: true,
      posts: posts.reverse(), // her reverse it for last post see first
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCaption = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
      //  ! only  owner can access to update his post Caption

    if (post.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    post.caption = req.body.caption;
    await post.save();
    res.status(200).json({
      success: true,
      message: "Post updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.commentOnPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id); 

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //! in this comments arr check if user already exist(mean user already comment) so 2nd times when he/she try to comment then open edit option for edit his won comment . and if user id is not present on comments arr that mean until this point , user not comment this post.    <<== this is the flow 


    let commentIndex = -1; // first i assume my comment index is -1 ok, next 

    // Checking if comment already exists
    post.comments.forEach((item, index) => { // hear i run forEach loop on comments arr . hear item is all  comment and index is the index where every comment are exist
      if (item.user.toString() === req.user._id.toString()) { // hear in item.user i access user id if i type item.comment so access every comment ok , but hear i try to match --> left side item.user(mean user id which is already exist in arr) === R.H.S, user id which i input 
        commentIndex = index; // if both id match then commentIndex become a real index number , so hear change index num
      }
    });

    if (commentIndex !== -1) { // if commentIndex not =  to -1 then 
      post.comments[commentIndex].comment = req.body.comment; // then EDIT my comment (which i received from req.body)  in that arr of index 

      await post.save(); // next save updated comment 

      return res.status(200).json({
        success: true,
        message: "Comment Updated",
      });
    } else { // otherwise if  user already NOT EXIST on comments arr so push the comment in comments arr . push 2 thing --> 1.user id(how comments) 2.comment(come from  req.body.comment)
      post.comments.push({ //* this comments arr exist on backend\models\Post.js\35-47
        user: req.user._id,
        comment: req.body.comment,
      });

      await post.save();
      return res.status(200).json({
        success: true,
        message: "Comment added",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//   delate  comment 
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // ! Checking If owner wants to delete 
    if (post.owner.toString() === req.user._id.toString()) { // who log in his post mean owner who make this post if he wont so , delate any comment 
      if (req.body.commentId === undefined) { // but must be check this comment have id if comment id === undefine or null so , show an err message
        return res.status(400).json({
          success: false,
          message: "Comment Id is required",
        });
      }

      // hear if owner check✅ then comment != undefined check✅ then run next line of code  
      post.comments.forEach((item, index) => { // hear comment id === req.body.commentId 
        if (item._id.toString() === req.body.commentId.toString()) {
          return post.comments.splice(index, 1); // then removed this index
        }
      });

      await post.save(); // after all changes save everything 

      return res.status(200).json({
        success: true,
        message: "Selected Comment has deleted",
      });
    } else {

      // i go to any post and give a comment , latter i decided that i want to removed this comment so then i use this 3 or 4 line of code .     in simple--> user who comment in any post only if his id is match then only he delate his won comment
      // ! if user want`s delate his won comment 
      post.comments.forEach((item, index) => {
        if (item.user.toString() === req.user._id.toString()) {
          return post.comments.splice(index, 1); // ! hear use return must because if i found comment index and removed this index . accuse comment index is 2 and arr have more than 1000 index & comment so i found my comment in  index number 2  so after delate this comment why i go anther index so after getting index of comment break the arr interaction  so, must use return
        }
      });

      await post.save();

      return res.status(200).json({
        success: true,
        message: "Your Comment has deleted",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
