const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(express.json());
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.0o9qayn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("EduHarmony").collection("users");
    const feedbackCollection = client
      .db("EduHarmony")
      .collection("userFeedback");
    const applyTeachingCollection = client
      .db("EduHarmony")
      .collection("applyTeaching");
    const classCollection = client.db("EduHarmony").collection("classes");

    // Added user in database as a student
    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User is already Exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    // get user feedback
    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });

    // apply for teaching
    app.post("/applyTeaching", async (req, res) => {
      const applyTeaching = req.body;
      const result = await applyTeachingCollection.insertOne(applyTeaching);
      res.send(result);
    });

    //Get user role by email
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // added abmin role
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Get all teachers request
    app.get("/teacherRequest", async (req, res) => {
      const result = await applyTeachingCollection.find().toArray();
      res.send(result);
    });

    // Approve and reject for teacher role
    app.patch("/teacherApproved/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const updateDoc = {
        $set: {
          role: "teacher",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/teacherApprovedRequest/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "teacher",
        },
      };
      const result = await applyTeachingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/teacherReject/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Reject",
        },
      };
      const result = await applyTeachingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // added classes
    app.post("/class", async (req, res) => {
      const classes = req.body;
      const result = await classCollection.insertOne(classes);
      res.send(result);
    });

    // Get all classes for admin dashboard
    app.get("/allClassesForAdmin", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // Approve teacher added class
    app.patch("/approvedClasses/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "accepted",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Reject teacher added class
    app.patch("/rejectClasses/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "rejected",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Get all my class data by email
    app.get("/myClasses/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // Find class by id
    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });


    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EduHarmony Server is Running!!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
