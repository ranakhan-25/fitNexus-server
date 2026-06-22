const { ObjectId } = require("mongodb");
const { db } = require("../config/db-connect");
const verifyToken = require("../config/verifyToken");
const favoriteRouter = require("express").Router();
const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");
const favoritesCollection = db.collection("favorites");

favoriteRouter.post("/api/favorites", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    if (!data.userId || !data.classId) {
      return res.status(400).json({
        success: false,
        message: "userId and classId required",
      });
    }

    const exists = await favoritesCollection.findOne({
      userId: data.userId,
      classId: data.classId,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Already in favorites",
      });
    }

    const result = await favoritesCollection.insertOne({
      ...data,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Added to favorites",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

favoriteRouter.get("/api/favorites/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const favorites = await favoritesCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      data: favorites,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

favoriteRouter.delete("/api/favorites/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await favoritesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    return res.json({
      success: true,
      message: "Removed from favorites",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


module.exports = favoriteRouter;
