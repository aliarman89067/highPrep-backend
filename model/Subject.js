import mongoose from "mongoose";

const SubjectSchema = new mongoose.Schema({
  name: { type: String, requird: true },
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chapter" }],
});

const SubjectModel =
  mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
export default SubjectModel;
