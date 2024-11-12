import mongoose from "mongoose";

const TrafficSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    authorizedUser: { type: Boolean },
  },
  { timestamps: true }
);

const TrafficModel = mongoose.model("traffic", TrafficSchema);

export default TrafficModel;
