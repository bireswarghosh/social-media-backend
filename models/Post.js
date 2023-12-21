const mongoose = require("mongoose");



//  this all part is define for post part that is as like any social-media like instagram  post 
const postSchema = new mongoose.Schema({
  caption: String,  // this is caption of post 

  image: {     // i use cloudinary for uploading img so, in cloudinary only use public_id and url  
    public_id: String, // who post that person id 
    url: String, // and url for showing this person url link to get his profile
  },

   // owner mean who post the img
  owner: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
  },

   //timestamp  when created
  createdAt: {  
    type: Date,
    default: Date.now,
  },

    // hear crate an arr for likes & comments --> hear if  user want to show all likes & comments in his post so, then accessing all likes & comments using arr[] . and this likes & comments are  more than one so, store them in an arr 

  likes: [   // for like only need who liked his id or name 
    {
      type: mongoose.Schema.Types.ObjectId, // basically who like and comments this person id  from reference to User schema  
      ref: "User", 
    },
  ],

  comments: [ // but in comments need who comments his id / name and need which he comments 
    {
      user: { // this is user  who comment , that user type mean user is which come from User schema 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      comment: {
        type: String,
        required: true, // hear it is true because to avoided empty comments otherwise empty comments will be post
      },
    },
  ],
});

module.exports = mongoose.model("Post", postSchema);
