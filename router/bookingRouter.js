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
      console.log(bookingData)
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
        success_url: `${process.env.JWKS_CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.JWKS_CLIENT_URL}/cancel`,
        customer_email: bookingData.userEmail || undefined,
        metadata: {
          classId: String(bookingData.classId),
          classImage: bookingData.classImage ? String(bookingData.classImage) : "",
          trainerId: bookingData.trainerId ? String(bookingData.trainerId) : "",
          trainerName: bookingData.trainerName ? String(bookingData.trainerName) : "",
          className: String(bookingData.className),
          price: String(bookingData.price),
          userId: String(bookingData.userId),
          userEmail: bookingData.userEmail ? String(bookingData.userEmail) : "",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                images: bookingData.classImage ? [bookingData.classImage] : [],
                name: bookingData.className,
              },
              unit_amount: Math.round(bookingData.price * 100),
            },
            quantity: 1,
          },
        ],
      });


      return res.status(200).json({
        success: true,
        message: "Checkout session generated successfully",
        id: session.id,
        url: session.url, 
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


bookingRouter.post(
  "/confirm-booking",
  verifyToken,
  async (req, res) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required to confirm the booking.",
        });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session || session.payment_status !== "paid") {
        return res.status(400).json({
          success: false,
          message: "Payment has not been completed for this session.",
        });
      }

      const meta = session.metadata || {};

      // Prevent duplicate booking if the success page is reloaded.
      const existingBooking = await bookingsCollection.findOne({
        $or: [
          { stripeSessionId: session.id },
          { classId: meta.classId, userId: meta.userId },
        ],
      });

      if (existingBooking) {
        return res.status(200).json({
          success: true,
          message: "Booking already confirmed.",
          insertedId: existingBooking._id,
        });
      }

      const booking = {
        stripeSessionId: session.id,
        classId: meta.classId,
        classImage: meta.classImage,
        trainerId: meta.trainerId,
        trainerName: meta.trainerName,
        className: meta.className,
        price: Number(meta.price) || 0,
        userId: meta.userId,
        userEmail: meta.userEmail || session.customer_email,
        paymentStatus: session.payment_status,
        status: "confirmed",
        bookingDate: new Date(),
      };

      const result = await bookingsCollection.insertOne(booking);

      return res.status(201).json({
        success: true,
        message: "Booking confirmed and saved successfully.",
        insertedId: result.insertedId,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error. Failed to confirm booking.",
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


bookingRouter.post("/api/booking", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    console.log(data)

    const result = await bookingsCollection.insertOne(data);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Booking not successfully",
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

      const classes = await bookingsCollection
        .find({
          classId: id,
        })
        .toArray();

      res.status(200).json({
        success: true,
        data: classes,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = bookingRouter;
