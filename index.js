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
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import CareerModel from "./model/Career.js";
import TrafficModel from "./model/Traffic.js";

const app = express();
app.use(cookieParser());
app.use("/stripe-checkout-webhook", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

const STRIPE = new Stripe(process.env.STRIPE_API_KEY);
const FRONTEND_URL = process.env.CLIENT_ORIGIN;

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
app.post("/getUnit", async (req, res) => {
  try {
    let playedSubUnitsId = null;
    const { gradeName, subjectName, subjectId, unitId, unitName } = req.body;
    const token = req.cookies.highschoolprep;
    if (token) {
      const {
        rest: { _id },
      } = jwt.verify(token, process.env.JWT_SECRET);
      const findUser = await UserModel.findById(_id);
      const isUnitExist = findUser.playedSubUnits.find(
        (item) => item.unitId === unitId
      );
      if (!isUnitExist) {
        findUser.playedSubUnits.push({
          gradeName,
          subjectName,
          subjectId,
          unitId,
          unitName,
        });
      }
      await findUser.save();
      playedSubUnitsId = findUser.playedSubUnits.find(
        (item) => item.unitId === unitId
      )._id;
    }

    const unitData = await UnitModel.findOne({ _id: unitId }).populate({
      path: "subUnits",
    });

    res.json({ data: unitData, playedId: playedSubUnitsId });
  } catch (error) {
    console.log(error);
  }
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
      newUser.oAuth = false;
      newUser.password = hashedPass;
      if (image) {
        newUser.image = image;
      }
      await newUser.save();
      const { password: newPassword, ...rest } = newUser.toObject();
      const token = jwt.sign({ rest }, process.env.JWT_SECRET);
      res.cookie("highschoolprep", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
      });

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
    const token = jwt.sign({ rest }, process.env.JWT_SECRET);
    res.cookie("highschoolprep", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

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
        const token = jwt.sign({ rest }, process.env.JWT_SECRET);
        res.cookie("highschoolprep", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "none",
        });

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
    newUser.oAuth = true;
    await newUser.save();
    const { password: newUserPass, ...rest } = newUser.toObject();
    const token = jwt.sign({ rest }, process.env.JWT_SECRET);
    res.cookie("highschoolprep", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });
    res.status(201).json({ success: true, data: rest });
  } catch (error) {
    res.status(400).json({ success: false, message: "Something went wrong" });
    console.log(error);
  }
});

let PACKAGESNAMES = {
  oneMonth: "1 Month",
  fourMonth: "4 Months",
  oneYear: "1 Year",
};

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { packageName } = req.body;

    if (
      packageName === PACKAGESNAMES.oneMonth ||
      packageName === PACKAGESNAMES.fourMonth ||
      packageName === PACKAGESNAMES.oneYear
    ) {
      const price = getPriceByName(packageName);
      const description = getDescByName(packageName);

      const cookie = req.cookies.highschoolprep;
      if (!cookie) {
        return res
          .status(404)
          .json({ success: false, message: "Cookie was not found" });
      }
      const {
        rest: { _id },
      } = await jwt.verify(cookie, process.env.JWT_SECRET);

      const sessionData = await STRIPE.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: price * 100,
              product_data: {
                name: packageName + " Package",
                description: description,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          packageName: packageName,
          userId: _id,
          packagePrice: price,
        },
        success_url: `${FRONTEND_URL}/payment-completed?packageName=${packageName}`,
        cancel_url: `${FRONTEND_URL}/payment-cancelled`,
      });
      if (!sessionData.url) {
        return res
          .status(400)
          .json({ success: false, message: "Url is not provided by stripe" });
      }
      res.status(201).json({ url: sessionData.url });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Wrong packages name" });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.raw.message });
  }
});

const getPriceByName = (packageName) => {
  const price =
    packageName === PACKAGESNAMES.oneMonth
      ? 5
      : packageName === PACKAGESNAMES.fourMonth
      ? 10
      : packageName === PACKAGESNAMES.oneYear
      ? 15
      : 0;
  return price;
};

const getDescByName = (packageName) => {
  let description;
  if (packageName === PACKAGESNAMES.oneMonth) {
    description =
      "The package will be available for one month, giving you plenty of time to explore its contents and enjoy its benefits before it's gone.";
  }
  if (packageName === PACKAGESNAMES.fourMonth) {
    description =
      "The package will be available for four months, allowing you to fully enjoy and explore its offerings at your own pace.";
  }
  if (packageName === PACKAGESNAMES.oneYear) {
    description =
      "This package lasts for an entire year, providing you with a wealth of benefits and experiences to enjoy throughout the months.";
  }
  return description;
};

app.post("/check-user", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(200).json({
        success: false,
        message: "User id not provided in request body",
      });
    }
    const cookie = req.cookies.highschoolprep;
    if (!cookie) {
      return res.status(200).json({
        success: false,
        message: "Cookie not found",
      });
    }
    const {
      rest: { _id },
    } = jwt.verify(cookie, process.env.JWT_SECRET);
    if (!_id) {
      return res.status(200).json({
        success: false,
        message: "_id not found from cookie",
      });
    }
    if (_id !== userId) {
      return res
        .status(200)
        .json({ success: false, message: "Id's are not matched" });
    } else {
      return res.status(200).json({ success: true, message: "User is valid" });
    }
  } catch (error) {
    console.log(error);

    res.status(400).json({ success: false, message: "Something went wrong" });
  }
});
app.post("/stripe-checkout-webhook", async (req, res) => {
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: `Stripe Error ${error.message}` });
  }
  if (event.type === "checkout.session.completed") {
    const userId = event.data.object.metadata?.userId;
    const packageName = event.data.object.metadata?.packageName;
    const packagePrice = event.data.object.metadata?.packagePrice;

    const currentDate = new Date(Date.now());

    let increamentTime =
      packageName === PACKAGESNAMES.oneMonth
        ? 1
        : packageName === PACKAGESNAMES.fourMonth
        ? 4
        : packageName === PACKAGESNAMES.oneYear
        ? 12
        : 0;

    const addTime = new Date(
      currentDate.setMonth(currentDate.getMonth() + increamentTime)
    ).getTime();

    await UserModel.findByIdAndUpdate(
      userId,
      {
        isPremium: true,
        packageName,
        purchaseAt: Date.now(),
        expiresAt: addTime,
        packagePrice,
      },
      { new: true }
    );
  }
});

app.delete("/logout-user", (req, res) => {
  try {
    res.cookie("highschoolprep", "");
    res.send("Cookie removed");
  } catch (error) {}
});

app.get("/get-profile-data/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const findUser = await UserModel.findById(userId);
    if (!findUser) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }
    const { password, ...rest } = findUser.toObject();
    res.status(200).send(rest);
  } catch (error) {
    console.log(error);
  }
});

app.post("/update-user-form", async (req, res) => {
  try {
    const { userId, name, email, image, oldPassword, newPassword } = req.body;
    const findUser = await UserModel.findById(userId);
    findUser.name = name;
    findUser.email = email;
    findUser.image = image;
    if (oldPassword && newPassword) {
      const checkOldPass = await bcrypt.compare(oldPassword, findUser.password);
      if (checkOldPass) {
        const newHashedPass = await bcrypt.hash(newPassword, 10);
        findUser.password = newHashedPass;
      } else {
        return res
          .status(200)
          .json({ success: false, message: "Old Password is wrong" });
      }
    }
    await findUser.save();
    const { password, ...rest } = findUser.toObject();
    res.status(201).json({ success: true, data: rest });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "Someting went wrong" });
  }
});
app.post("/update-play-time", async (req, res) => {
  try {
    const { playedSubUnitsId, time } = req.body;
    const token = req.cookies.highschoolprep;

    if (!token) {
      return res
        .status(404)
        .json({ success: false, message: "Token not found" });
    }

    const {
      rest: { _id },
    } = jwt.verify(token, process.env.JWT_SECRET);

    const data = await UserModel.findById(_id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Find the index of the playedSubUnit to update
    const unitIndex = data.playedSubUnits.findIndex(
      (unit) => unit._id.toString() === playedSubUnitsId
    );

    if (unitIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "SubUnit not found" });
    }

    // Update the playedTime directly in the database
    const newData = await UserModel.findByIdAndUpdate(
      _id,
      { $set: { [`playedSubUnits.${unitIndex}.playedTime`]: time } },
      { new: true }
    );

    res.status(200).json({ success: true, newData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.get("/get-grade-by-name/:gradeName", async (req, res) => {
  try {
    const { gradeName } = req.params;
    const gradesData = await GradeModel.findOne({
      name: { $regex: new RegExp(`^${gradeName}$`, "i") },
    })
      .populate({
        path: "subjects",
        populate: { path: "chapters", populate: { path: "units" } },
      })
      .exec();
    if (!gradesData) {
      return res
        .status(404)
        .json({ success: false, message: "Grade not found" });
    }
    res.json({ data: gradesData });
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-grade-by-subject/:subjectName", async (req, res) => {
  try {
    const { subjectName } = req.params;
    const gradesData = await GradeModel.find()
      .populate({
        path: "subjects",
        populate: { path: "chapters", populate: { path: "units" } },
      })
      .exec();
    if (!gradesData) {
      return res
        .status(404)
        .json({ success: false, message: "Grade not found" });
    }
    let customGrade = [];
    gradesData.forEach((grade) => {
      grade.subjects.forEach((subject) => {
        if (subject.name === subjectName) {
          customGrade.push({
            _id: grade._id,
            name: grade.name,
            description: grade.description,
            subjects: [{ subject }],
          });
        }
      });
    });
    const filterCustomGrade = customGrade.filter((item) =>
      item.subjects.find((subject) => subject.subject.chapters.length > 0)
    );

    res.json({ data: filterCustomGrade.length > 0 ? filterCustomGrade : null });
  } catch (error) {
    console.log(error);
  }
});

app.post("/create-career-form", async (req, res) => {
  try {
    const requestData = req.body;

    const newCareerForm = await CareerModel.create(requestData);
    res.status(201).json(newCareerForm);
  } catch (error) {
    console.log(error);
  }
});

app.get("/add-traffic", async (req, res) => {
  try {
    const token = req.cookies.highschoolprep;
    if (token) {
      const {
        rest: { _id },
      } = jwt.verify(token, process.env.JWT_SECRET);
      await TrafficModel.create({ userId: _id, authorizedUser: true });
      res.status(201).send("traffic Updated");
      return;
    } else {
      await TrafficModel.create({ authorizedUser: false });
      res.status(201).send("traffic Updated");
      return;
      // If Token not exist
    }
  } catch (error) {
    console.log(error);
  }
});
app.get("/update-user-membership/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.cookies.highschoolprep;
    if (!token) {
      return res
        .status(404)
        .json({ success: false, message: "Token not found" });
    }
    const {
      rest: { _id },
    } = jwt.verify(token, process.env.JWT_SECRET);
    if (userId !== _id)
      return res
        .status(400)
        .json({ success: false, message: "User id not matched" });
    const findUser = await UserModel.findById(userId);
    const { password, ...rest } = findUser.toObject();
    res.status(200).json({ ...rest });
  } catch (error) {
    console.log(error);
  }
});
