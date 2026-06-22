const { ObjectId } = require("mongodb");
const { db } = require("../config/db-connect");
const verifyToken = require("../config/verifyToken");
const trainerRouter = require("express").Router();
const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");
const trainerApplicationsCollection = db.collection("trainerApplications");


trainerRouter.post(
  "/api/trainer-applications",
  verifyToken,
  async (req, res) => {
    try {
      const application = req.body;

      const existingApplication = await trainerApplicationsCollection.findOne({
        userEmail: application.email,
      });

      if (existingApplication) {
        return res.status(400).send({
          success: false,
          message: "You have already applied",
        });
      }

      application.status = "pending";
      application.feedback = "";
      application.createdAt = new Date();

      const result = await trainerApplicationsCollection.insertOne(application);

      res.status(201).send({
        success: true,
        message: "Application submitted successfully",
        insertedId: result.insertedId,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

trainerRouter.get(
  "/trainer-applications/:email", verifyToken,
  async (req, res) => {
    try {
      const { email } = req.params;

      const application = await trainerApplicationsCollection.findOne({
        email,
      });

      res.send({
        success: true,
        data: application,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

trainerRouter.get(
  "/trainer/overview",
  async (req, res) => {
    try {
      const { trainerId } = req.query;

      const classes = await classesCollection.find({ trainerId }).toArray();

      const classIds = classes.map((c) => c._id);

      const bookings = await bookingsCollection
        .find({trainerId: trainerId})
        .toArray();

      const totalClasses = classes.length;
      const totalStudents = bookings.length;

      res.json({
        success: true,
        totalClasses,
        totalStudents,
        students: bookings,
      });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  },
);

trainerRouter.get("/trainer/overview/:trainerId",verifyToken, async (req, res) => {
  try {
    const { trainerId } = req.params;

    if (!trainerId) {
      return res.status(400).json({
        success: false,
        message: "Trainer ID required",
      });
    }

    // 1. Trainer info
    const trainer = await usersCollection.findOne({
      _id: new ObjectId(trainerId),
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    if (trainer.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Trainer is blocked",
      });
    }
    // 2. Total classes created
    const totalClasses = await classesCollection.countDocuments({
      trainerId,
    });

    // 3. All classes of this trainer
    const trainerClasses = await classesCollection
      .find({ trainerId })
      .toArray();

    const classIds = trainerClasses.map((c) => c._id.toString());

    // 4. Total students enrolled (bookings)
    const totalStudents = await bookingsCollection.countDocuments({
      classId: { $in: classIds },
    });

    return res.status(200).json({
      success: true,
      data: {
        trainer,
        totalClasses,
        totalStudents,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = trainerRouter;
