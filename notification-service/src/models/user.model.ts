import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  bio: {
    type: String,
  },
  avatar: {
    type: String, 
  },
});  

const User = mongoose.model("User", userSchema);

export default User;
