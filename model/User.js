import mongoose, { now } from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  image: {
    type: String,
    default:
      "https://static.vecteezy.com/system/resources/thumbnails/004/511/281/small/default-avatar-photo-placeholder-profile-picture-vector.jpg",
  },
  isPremuim: { type: Boolean, default: false },
  packageName: { type: String },
  purchaseAt: { type: Date },
  expiresAt: { type: Date },
});

const UserModel = mongoose.model("user", UserSchema);

export default UserModel;
