const { ObjectId } = require("mongodb");
const { db } = require("../config/db-connect");
const verifyToken = require("../config/verifyToken");
const adminRouter = require("express").Router();
const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");
const favoritesCollection = db.collection("favorites");
const forumCommentsCollection = db.collection("forumComments");
const trainerApplicationsCollection = db.collection("trainerApplications");

const verifyAdmin = async (req, res, next) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: Missing user information" 
      });
    }
    
    const user = await usersCollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in the database" 
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: You do not have admin permissions" 
      });
    }

    next();

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error in Admin Verification", 
      error: error.message 
    });
  }
};


adminRouter.get("/api/admin/users", verifyToken, async (req, res) => {
  try {
    const users = await usersCollection
      .find({})
      .project({
        password: 0,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
});

adminRouter.get("/api/admin/overview", async (req, res) => {
  try {
    // ===== TOTAL USERS =====
    const totalUsers = await usersCollection.countDocuments();

    // ===== TOTAL CLASSES =====
    const totalClasses = await classesCollection.countDocuments();

    // ===== TOTAL BOOKINGS =====
    const totalBookings = await bookingsCollection.countDocuments();

    // (Optional) recent stats example
    const recentUsers = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const recentClasses = await classesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return res.status(200).json({
      success: true,
      stats: {
        users: totalUsers,
        classes: totalClasses,
        bookings: totalBookings,
      },
      recent: {
        users: recentUsers,
        classes: recentClasses,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Admin overview API failed",
    });
  }
});

adminRouter.patch(
  "/api/admin/users/:id/block",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "blocked" } },
      );

      res.json({ success: true, message: "User blocked" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

adminRouter.patch(
  "/api/admin/users/:id/unblock",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "active" } },
      );

      res.json({ success: true, message: "User unblocked" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

adminRouter.patch(
  "/api/admin/users/:id/make-admin",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin" } },
      );

      res.json({ success: true, message: "User promoted to admin" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// for trainer
adminRouter.get(
  "/api/admin/trainer-applications",
  verifyToken,
  async (req, res) => {
    try {
      const applications = await trainerApplicationsCollection
        .find({
          status: "pending",
        })
        .toArray();

      res.json({
        success: true,
        applications,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

adminRouter.patch(
  "/api/admin/trainer-applications/:id/approve",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const application = await trainerApplicationsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      await usersCollection.updateOne(
        {
          email: application.email,
        },
        {
          $set: {
            role: "trainer",
          },
        },
      );

      await trainerApplicationsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            status: "approved",
            approvedAt: new Date(),
          },
        },
      );

      res.json({
        success: true,
        message: "Trainer approved",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

adminRouter.patch(
  "/api/admin/trainer-applications/:id/reject",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;

      await trainerApplicationsCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            status: "rejected",
            feedback,
            rejectedAt: new Date(),
          },
        },
      );

      res.json({
        success: true,
        message: "Application rejected",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

adminRouter.get("/api/admin/trainers", verifyToken, async (req, res) => {
  try {
    const trainers = await usersCollection.find({ role: "trainer" }).toArray();

    res.json({
      success: true,
      data: trainers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch trainers",
    });
  }
});

adminRouter.patch(
  "/api/admin/trainers/:id/demote",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            role: "user",
          },
        },
      );

      if (result.modifiedCount === 0) {
        return res.json({
          success: false,
          message: "No trainer updated",
        });
      }

      res.json({
        success: true,
        message: "Trainer demoted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

// classes
adminRouter.get("/api/admin/classes", verifyToken, async (req, res) => {
  try {
    const classes = await classesCollection
      .find()
      .sort({ createdAt: -1 }) // নতুন তৈরি করা ক্লাসগুলো ক্রমানুসারে উপরে দেখাবে
      .toArray();

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch classes data",
    });
  }
});

// 2. PATCH UPDATE CLASS STATUS
adminRouter.patch(
  "/api/admin/classes/:id/status",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status parameters. Must be approved or rejected.",
        });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unique class ID format.",
        });
      }

      const result = await classesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { status },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Targeted class not found.",
        });
      }

      res.json({
        success: true,
        message: `Class status updated to ${status}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal backend microservice execution error",
      });
    }
  },
);

// 3. DELETE CLASS ROUTE
adminRouter.delete("/api/admin/classes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid unique class ID format.",
      });
    }

    const result = await classesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Class already deleted or does not exist.",
      });
    }

    res.json({
      success: true,
      message: "Class deleted successfully from cloud database",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear the selected class data",
    });
  }
});

// forum poste
adminRouter.get("/api/admin/forum-posts", verifyToken, async (req, res) => {
  try {
    const posts = await forumCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
    });
  }
});

// 2. DELETE SINGLE FORUM POST
adminRouter.delete(
  "/api/admin/forum-posts/:id",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Post ID format provided",
        });
      }

      const result = await forumCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Post not found or already deleted",
        });
      }

      res.json({
        success: true,
        message: "Post deleted successfully from database",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server execution error",
      });
    }
  },
);

adminRouter.get("/api/admin/transactions", verifyToken,verifyAdmin, async (req, res) => {
  try {
    const transactions = await bookingsCollection
      .find({ paymentStatus: "Paid" })
      .sort({ bookingDate: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: Failed to fetch transactions",
      error: error.message,
    });
  }
});

module.exports = adminRouter;
