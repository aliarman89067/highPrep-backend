import mongoose from "mongoose";

const ChapterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  units: [{ type: mongoose.Schema.Types.ObjectId, ref: "Unit" }],
});

const ChapterModel = mongoose.model("Chapter", ChapterSchema);
export default ChapterModel;
