import mongoose from "mongoose";

const UnitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubUnit" }],
});

const UnitModel = mongoose.model("Unit", UnitSchema);
export default UnitModel;
