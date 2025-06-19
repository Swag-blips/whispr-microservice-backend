import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  username: {
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
