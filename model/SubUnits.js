import mongoose from "mongoose";

const SubUnitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  correctAnswer: [{ id: Number, answer: String }],
  html: { type: String, required: true },
  review: { type: String },
  explanation: { type: String },
  reviewHeight: { type: Number },
  explanationHeight: { type: Number },
  questionHeight: { type: Number },
});

const SubUnitModel = mongoose.model("SubUnit", SubUnitSchema);

export default SubUnitModel;
