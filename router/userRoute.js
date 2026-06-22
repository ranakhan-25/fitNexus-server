const { ObjectId } = require("mongodb");
const { db } = require("../config/db-connect");
const userRouter = require("express").Router();
const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");
const favoritesCollection = db.collection("favorites");
const trainerApplicationsCollection = db.collection("trainerApplications");

userRouter.get("/api/users/dashboard-stats/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await usersCollection.findOne({ email });

    const totalBookedClasses = await bookingsCollection.countDocuments({
      userEmail:email,
    });



    const totalFavorites = await favoritesCollection.countDocuments({
      userEmail:email,
    });

    const trainerApplication =
      await trainerApplicationsCollection.findOne({
        email,
      });

    res.send({
      success: true,
      data: {
        totalBookedClasses,
        totalFavorites,
        user,
        trainerApplication,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

module.exports = userRouter