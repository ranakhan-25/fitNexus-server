const { ObjectId } = require("mongodb");
const { db } = require("../config/db-connect");
const verifyToken = require("../config/verifyToken");
const classRouter = require("express").Router();

const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");


classRouter.post("/api/classes", verifyToken, async (req, res) => {
  try {

    const classData = req.body;

    const requiredFields = [
      "className",
      "trainerId",
      "trainerName",
      "category",
      "difficulty",
      "duration",
      "schedule",
      "price",
      "description",
      "image",
    ];

    for (let field of requiredFields) {
      if (!classData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const newClass = {
      ...classData,
      status: "Pending",
      bookingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await classesCollection.insertOne(newClass);

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

classRouter.get("/api/classes", async (req, res) => {
  try {
    const {
      trainerId,
      search = "",
      category = "",
      page = 1,
      limit = 6,
    } = req.query;

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 6;

    let query = {};

    if (trainerId) {
      query.trainerId = trainerId;
    } else {
      query.status = "Approved";

      if (search) {
        query.className = { $regex: search, $options: "i" };
      }

      if (category) {
        query.category = category;
      }
    }

    const total = await classesCollection.countDocuments(query);

    const classes = await classesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .toArray();

    return res.status(200).json({
      success: true,
      classes,
      total,
      currentPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
    });
  }
});

classRouter.get("/api/classes/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    const data = await classesCollection.findOne({
      _id: new ObjectId(id),
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

classRouter.patch("/api/classes/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    const result = await classesCollection.updateOne(
      { _id: id },
      {
        $set: {
          ...req.body,
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      message: "Updated successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

classRouter.delete("/api/classes/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    const result = await classesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.json({
      success: true,
      message: "Deleted successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});


module.exports = classRouter;
