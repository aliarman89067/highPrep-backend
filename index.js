import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import GradeModel from "./model/Grade.js";
import SubjectModel from "./model/Subject.js";
import ChapterModel from "./model/Chapter.js";
import SubUnit from "./model/SubUnits.js";
import UnitModel from "./model/Unit.js";
import UserModel from "./model/User.js";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(3000, () => {
      console.log("App is running on port 3000");
    });
  })
  .catch((error) => {
    console.log(error);
  });

app.get("/getGrades", async (req, res) => {
  const gradesData = await GradeModel.find()
    .populate({
      path: "subjects",
      populate: { path: "chapters", populate: { path: "units" } },
    })
    .exec();

  res.json(gradesData);
});
app.get("/getGradeById/:subjectId", async (req, res) => {
  const { subjectId } = req.params;
  const gradesData = await SubjectModel.findOne({ _id: subjectId }).populate({
    path: "chapters",
    populate: { path: "units" },
  });

  res.json(gradesData);
});
app.get("/getUnit/:unitId", async (req, res) => {
  const { unitId } = req.params;
  const unitData = await UnitModel.findOne({ _id: unitId }).populate({
    path: "subUnits",
  });

  res.json(unitData);
});

app.post("/create-user", async (req, res) => {
  try {
    const { name, email, password, image } = req.body;
    const findUser = await UserModel.findOne({ email });
    if (findUser) {
      return res.json({ success: false, message: "This email already used" });
    } else {
      const hashedPass = await bcrypt.hash(password, 10);
      const newUser = new UserModel();
      newUser.name = name;
      newUser.email = email;
      newUser.password = hashedPass;
      if (image) {
        newUser.image = image;
      }
      await newUser.save();
      const { password: newPassword, ...rest } = newUser.toObject();
      res.status(201).json({ success: true, data: rest });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "Something went wrong" });
  }
});

app.post("/get-user", async (req, res) => {
  const { email, password } = req.body;
  try {
    const findUser = await UserModel.findOne({ email });
    if (!findUser) {
      return res.json({
        success: false,
        message: "Email or password is wrong",
      });
    }
    const checkPass = await bcrypt.compare(password, findUser.password);
    if (!checkPass) {
      return res.json({
        success: false,
        message: "Email or password is wrong",
      });
    }
    const { password: modelPass, ...rest } = findUser.toObject();
    res.status(200).json({ success: true, data: rest });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Something went wrong" });
  }
});

app.post("/create-user-google", async (req, res) => {
  try {
    const { name, email, image, uid } = req.body;

    const findUser = await UserModel.findOne({ email });
    if (findUser) {
      const checkPass = await bcrypt.compare(uid, findUser.password);
      if (checkPass) {
        const { password: modelPass, ...rest } = findUser.toObject();
        return res.status(200).json({ success: true, data: rest });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Something went wrong" });
      }
    }
    const hashPass = await bcrypt.hash(uid, 10);
    const newUser = new UserModel();
    newUser.name = name;
    newUser.email = email;
    newUser.password = hashPass;
    newUser.image = image;
    await newUser.save();
    const { password: newUserPass, ...rest } = newUser.toObject();
    res.status(201).json({ success: true, data: rest });
  } catch (error) {
    res.status(400).json({ success: false, message: "Something went wrong" });
    console.log(error);
  }
});

app.get("/test", (req, res) => {
  res.send("Hello World");
});
