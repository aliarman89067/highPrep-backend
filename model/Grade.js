import mongoose from "mongoose";

const GradeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    subjects: [{ ref: "Subject", type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

const GradeModel = mongoose.model("Grade", GradeSchema);
export default GradeModel;
