const express = require("express");
const { db } = require("../config/db-connect");
const { ObjectId } = require("mongodb");
const verifyToken = require("../config/verifyToken");

const forumRouter = express.Router();

const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");
const forumCommentsCollection = db.collection("forumComments");


forumRouter.post("/api/forum-posts", verifyToken, async (req, res) => {
  try {
    const post = req.body;

    if (!post.title || !post.description || !post.image) {
      return res.status(400).json({
        success: false,
        message: "Title, image and description are required",
      });
    }

    const forumPost = {
      title: post.title,
      description: post.description,
      image: post.image,

      authorId: post.authorId,
      authorName: post.authorName,
      authorImage: post.authorImage,

      role: post.role || "trainer",

      likes: 0,
      dislikes: 0,

      createdAt: new Date(),
    };

    const result = await forumCollection.insertOne(forumPost);

    return res.status(201).json({
      success: true,
      message: "Forum post created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

forumRouter.get("/api/forum-posts/:authorId", async (req, res) => {
  const { authorId } = req.params;

  const posts = await forumCollection
    .find({ authorId })
    .sort({ createdAt: -1 })
    .toArray();

  res.send(posts);
});

forumRouter.get("/api/forum/latest", async (req, res) => {
  try {
    const posts = await forumCollection
      .find({})
      .sort({ createdAt: -1 }) // 🔥 latest first
      .limit(4)
      .toArray();

    res.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("LATEST FORUM ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load forum posts",
    });
  }
});

forumRouter.delete("/api/forum-posts/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post id",
      });
    }

    const result = await forumCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

forumRouter.get("/api/forum-posts", async (req, res) => {
  try {
    const { search = "", role = "", page = 1, limit = 6 } = req.query;

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);

    let query = {};

    if (search) {
      query.title = {
        $regex: search,
        $options: "i",
      };
    }

    if (role) {
      query.role = role;
    }
    // =========================
    const total = await forumCollection.countDocuments(query);

    const posts = await forumCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .toArray();

    return res.status(200).json({
      success: true,
      posts,
      total,
      currentPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch forum posts",
    });
  }
});

forumRouter.get("/api/forum-post/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // =========================
    // FIND POST
    // =========================
    const post = await forumCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    throw new Error("Single Post API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch post",
    });
  }
});

forumRouter.post("/api/forum-posts/:id/like", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const post = await forumCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!post) return res.status(404).json({ success: false });

    const alreadyLiked = post.likedBy?.includes(userId);
    const alreadyDisliked = post.dislikedBy?.includes(userId);

    if (alreadyLiked) {
      return res.status(400).json({ success: false, message: "Already liked" });
    }

    await forumCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: {
          likes: 1,
          ...(alreadyDisliked ? { dislikes: -1 } : {}),
        },
        $push: { likedBy: userId },
        $pull: { dislikedBy: userId },
      },
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

forumRouter.post(
  "/api/forum-posts/:id/dislike",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const post = await forumCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!post) return res.status(404).json({ success: false });

      const alreadyDisliked = post.dislikedBy?.includes(userId);
      const alreadyLiked = post.likedBy?.includes(userId);

      if (alreadyDisliked) {
        return res
          .status(400)
          .json({ success: false, message: "Already disliked" });
      }

      await forumCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: {
            dislikes: 1,
            ...(alreadyLiked ? { likes: -1 } : {}),
          },
          $push: { dislikedBy: userId },
          $pull: { likedBy: userId },
        },
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  },
);

// add comment
forumRouter.post(
  "/api/forum-posts/:postId/comments",
  verifyToken,
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { userId, userName, userImage, text } = req.body;

      if (!userId || !text) {
        return res.status(400).send({
          success: false,
          message: "Missing fields",
        });
      }

      const comment = {
        _id: new ObjectId().toString(),
        userId,
        userName,
        userImage: userImage || "",
        text,
        createdAt: new Date(),
        updatedAt: new Date(),
        replies: [],
      };

      await forumCollection.updateOne(
        { _id: new ObjectId(postId) },
        {
          $push: {
            comments: comment,
          },
        },
      );

      res.send({
        success: true,
        comment,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

// edit comment
forumRouter.patch(
  "/api/forum-posts/:postId/comments/:commentId",
  verifyToken,
  async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { userId, text } = req.body;

      const post = await forumCollection.findOne({
        _id: new ObjectId(postId),
      });

      const comment = post.comments.find((c) => c._id === commentId);

      if (!comment) {
        return res.status(404).send({
          success: false,
          message: "Comment not found",
        });
      }

      if (comment.userId !== userId) {
        return res.status(403).send({
          success: false,
          message: "Unauthorized",
        });
      }

      await forumCollection.updateOne(
        {
          _id: new ObjectId(postId),
          "comments._id": commentId,
        },
        {
          $set: {
            "comments.$.text": text,
            "comments.$.updatedAt": new Date(),
          },
        },
      );

      res.send({
        success: true,
        message: "Comment updated",
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

// delete comment
forumRouter.delete(
  "/api/forum-posts/:postId/comments/:commentId",
  verifyToken,
  async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { userId } = req.body;

      const post = await forumCollection.findOne({
        _id: new ObjectId(postId),
      });

      const comment = post.comments.find((c) => c._id === commentId);

      if (!comment) {
        return res.status(404).send({
          success: false,
          message: "Comment not found",
        });
      }

      if (comment.userId !== userId) {
        return res.status(403).send({
          success: false,
          message: "Unauthorized",
        });
      }

      await forumCollection.updateOne(
        { _id: new ObjectId(postId) },
        {
          $pull: {
            comments: {
              _id: commentId,
            },
          },
        },
      );

      res.send({
        success: true,
        message: "Comment deleted",
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

// add reply comment
forumRouter.post(
  "/api/forum-posts/:postId/comments/:commentId/reply",
  verifyToken,
  async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { userId, userName, userImage, text } = req.body;

      const reply = {
        _id: new ObjectId().toString(),
        userId,
        userName,
        userImage: userImage || "",
        text,
        createdAt: new Date(),
      };

      await forumCollection.updateOne(
        {
          _id: new ObjectId(postId),
          "comments._id": commentId,
        },
        {
          $push: {
            "comments.$.replies": reply,
          },
        },
      );

      res.send({
        success: true,
        reply,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

// edit reply comment
forumRouter.patch(
  "/api/forum-posts/:postId/comments/:commentId/replies/:replyId",
  verifyToken,
  async (req, res) => {
    try {
      const { postId, commentId, replyId } = req.params;
      const { userId, text } = req.body;

      const post = await forumCollection.findOne({
        _id: new ObjectId(postId),
      });

      const comment = post.comments.find((c) => c._id === commentId);

      const reply = comment?.replies?.find((r) => r._id === replyId);

      if (!reply) {
        return res.status(404).send({
          success: false,
          message: "Reply not found",
        });
      }

      if (reply.userId !== userId) {
        return res.status(403).send({
          success: false,
          message: "Unauthorized",
        });
      }

      comment.replies = comment.replies.map((r) =>
        r._id === replyId ? { ...r, text, updatedAt: new Date() } : r,
      );

      await forumCollection.updateOne(
        { _id: new ObjectId(postId) },
        {
          $set: {
            comments: post.comments,
          },
        },
      );

      res.send({
        success: true,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

// delete reply comment
forumRouter.delete(
  "/api/forum-posts/:postId/comments/:commentId/replies/:replyId",
  verifyToken,
  async (req, res) => {
    try {
      const { postId, commentId, replyId } = req.params;
      const { userId } = req.body;

      const post = await forumCollection.findOne({
        _id: new ObjectId(postId),
      });

      const comment = post.comments.find((c) => c._id === commentId);

      const reply = comment?.replies?.find((r) => r._id === replyId);

      if (!reply) {
        return res.status(404).send({
          success: false,
          message: "Reply not found",
        });
      }

      if (reply.userId !== userId) {
        return res.status(403).send({
          success: false,
          message: "Unauthorized",
        });
      }

      comment.replies = comment.replies.filter((r) => r._id !== replyId);

      await forumCollection.updateOne(
        { _id: new ObjectId(postId) },
        {
          $set: {
            comments: post.comments,
          },
        },
      );

      res.send({
        success: true,
        message: "Reply deleted",
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = forumRouter;
