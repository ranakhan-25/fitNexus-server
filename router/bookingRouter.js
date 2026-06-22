const { ObjectId } = require("mongodb");
const Stripe = require("stripe");
const { db } = require("../config/db-connect");
const verifyToken = require("../config/verifyToken");
const bookingRouter = require("express").Router();
const forumCollection = db.collection("forum-posts");
const classesCollection = db.collection("classes");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

bookingRouter.post(
  "/create-checkout-session",
  verifyToken,
  async (req, res) => {
    try {
      const bookingData = req.body;

      if (
        !bookingData ||
        !bookingData.price ||
        !bookingData.className ||
        !bookingData.userId ||
        !bookingData.classId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required booking details (Price, Class Name, User ID, or Class ID).",
        });
      }

      const existingBooking = await bookingsCollection.findOne({
        classId: bookingData.classId,
        userId: bookingData.userId,
      });

      if (existingBooking) {
        return res.status(400).json({
          success: false,
          message: "You have already booked this class.",
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `${process.env.JWKS_CLIENT_URL}/success`,
        cancel_url: `${process.env.JWKS_CLIENT_URL}/cancel`,
        customer_email: bookingData.userEmail || undefined,

        metadata: {
          classId: bookingData.classId,
          userId: bookingData.userId,
          trainerId: bookingData.trainerId,
          trainerName: bookingData.trainerName,
          className: bookingData.className,
          price: bookingData.price.toString(),
          userEmail: bookingData.userEmail || "",
        },

        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                images: bookingData.classImage ? [bookingData.classImage] : [],
                name: bookingData.className,
                description: `Trainer: ${bookingData.trainerName || "N/A"}`,
              },
              unit_amount: Math.round(bookingData.price * 100),
            },
            quantity: 1,
          },
        ],
      });

      const result = await bookingsCollection.insertOne({
        ...bookingData,
        stripeSessionId: session.id,
        paymentStatus: "Paid",
        status: "Approved",
        bookingDate: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Checkout session generated successfully",
        id: session.id,
        url: session.url,
        bookingId: result.insertedId,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error. Failed to create checkout session.",
        error: error.message,
      });
    }
  },
);

bookingRouter.get("/api/bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required.",
      });
    }

    const bookings = await bookingsCollection
      .find({
        userEmail: email,
      })
      .sort({ bookingDate: -1 })
      .toArray();

    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      classId: booking.classId,
      className: booking.className,
      classImage: booking.classImage,
      trainerId: booking.trainerId,
      trainerName: booking.trainerName,
      price: Number(booking.price) || 0,
      userId: booking.userId,
      userEmail: booking.userEmail,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      bookingDate: booking.bookingDate,
    }));

    return res.status(200).json({
      success: true,
      count: formattedBookings.length,
      data: formattedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Failed to fetch user bookings.",
      error: error.message,
    });
  }
});

bookingRouter.get(
  "/api/bookings/class/:classId",
  verifyToken,
  async (req, res) => {
    try {
      const classId = req.params.classId;

      const data = await classesCollection.findOne({
        _id: new ObjectId(classId),
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  },
);

bookingRouter.get(
  "/api/bookings/trainer/classes/:id",
  verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const classes = await bookingsCollection.find({
        classId: id,
      }).toArray();


      res.status(200).json({
        success: true,
        data:classes
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        message:error.message
      })
    }
  },
);

module.exports = bookingRouter;
