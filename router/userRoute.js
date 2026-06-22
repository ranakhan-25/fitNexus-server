const { ObjectId } = require("mongodb");
const { db } = require("../config/db-connect");
const verifyToken = require("../config/verifyToken");
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

userRouter.patch("/api/user/update", verifyToken, async (req, res) => {
  try {
    const requesterEmail = req.user?.email; 
    const { _id, name, image } = req.body; 

    if (!_id) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID (_id) is missing in request body." 
      });
    }

    if (!ObjectId.isValid(_id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid User ID format." 
      });
    }

   
    const user = await usersCollection.findOne({ _id: new ObjectId(_id) });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in database." 
      });
    }

    if (user.email !== requesterEmail) {
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: You can only update your own profile." 
      });
    }

    const updateDoc = {
      $set: {
        name: name || user.name,
        image: image || user.image,
        updatedAt: new Date() 
      }
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(_id) }, 
      updateDoc
    );

    
    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected. Profile remains the same.",
        updatedData: {
          name: user.name,
          image: user.image,
          updatedAt: user.updatedAt || new Date()
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      updatedData: {
        name: name || user.name,
        image: image || user.image,
        updatedAt: updateDoc.$set.updatedAt
      }
    });

  } catch (error) {
    // console.error("Error in profile update API:", error); 
    res.status(500).json({
      success: false,
      message: "Internal Server Error during profile update.",
      error: error.message
    });
  }
});

module.exports = userRouter