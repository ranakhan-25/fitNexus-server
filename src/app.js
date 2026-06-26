require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { client } = require("../config/db-connect");
const classRouter = require("../router/classesRouter");
const forumRouter = require("../router/forumRouter");
const userRouter = require("../router/userRoute");
const favoriteRouter = require("../router/favoriteRouter");
const bookingRouter = require("../router/bookingRouter");
const trainerRouter = require("../router/trainerRouter");
const adminRouter = require("../router/adminRouter");
const app = express();



app.use(cors());



app.use(express.json());

app.use(bookingRouter);
app.use(classRouter);
app.use(forumRouter);
app.use(userRouter);
app.use(favoriteRouter);
app.use(trainerRouter);
app.use(adminRouter);

async function run() {
  try {
    await client.connect();

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("hello world");
});

module.exports = app;
