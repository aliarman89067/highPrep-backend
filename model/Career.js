import mongoose from "mongoose";

const CareerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    position: { type: String, required: true },
    resume: { type: String, required: true },
  },
  { timestamps: true }
);

const CareerModel = mongoose.model("career", CareerSchema);

export default CareerModel;
