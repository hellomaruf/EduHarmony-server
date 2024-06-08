const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const paymentCollection = client.db("EduHarmony").collection("payments");
    const assignmentCollection = client
      .db("EduHarmony")
      .collection("assignments");
    const assignmentSubmitCollection = client
      .db("EduHarmony")
      .collection("submittedAssignments");

    // jwt generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });

      res.send({ token });
    });

    // middleware
    const verifyToken = (req, res, next) => {
      console.log("From verify token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

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
    app.post("/applyTeaching", verifyToken, async (req, res) => {
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
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("pagination query", page, size);
      const count = await usersCollection.find().count();
      const result = await usersCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ result, count });
    });

    // added abmin role
    app.patch("/users/:id", verifyToken, async (req, res) => {
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
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("pagination query", page, size);
      const count = await applyTeachingCollection.find().count();
      const result = await applyTeachingCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ result, count });
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
    app.post("/class", verifyToken, async (req, res) => {
      const classes = req.body;
      const result = await classCollection.insertOne(classes);
      res.send(result);
    });

    // Get all classes for admin dashboard
    app.get("/allClassesForAdmin", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("pagination query", page, size);
      const count = await usersCollection.find().count();
      const result = await classCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ result, count });
    });

    app.get("/allClassForHome", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/allUsersForHome", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/acceptedClasses/:status", async (req, res) => {
      const status = req.params.status;
      const query = { status: status };
      const result = await classCollection.find(query).toArray();
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
    app.get("/myClasses/:email", verifyToken, async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log("pagination query", page, size);
      const count = await usersCollection.find().count();
      const email = req.params.email;
      const query = { email };
      const result = await classCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ result, count });
    });

    // Find class by id for update
    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    // update Class
    app.patch("/updateClass/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateClass = req.body;
      const updateDoc = {
        $set: {
          title: updateClass.title,
          price: updateClass.price,
          photo: updateClass.photo,
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete class by id
    app.delete("/deleteClass/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(filter);
      res.send(result);
    });

    // Get classes details for enroll
    app.get("/classDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    // Get for Payment
    app.get("/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    // payment related api
    app.post("/payment", verifyToken, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    // get all payments (for home page)
    app.get("/allPayments", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    // Increment  enrollment count by payment
    app.patch("/enrollmentCount/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          totalEnrollment: 1,
        },
      };
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // get enroll class for (enroll class details page)
    app.get("/enrollClassDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { classId: id };
      const result = await assignmentCollection.find(query).toArray();
      res.send(result);
    });

    // my enroll class
    app.get("/myEnroll/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // get total enrollment my classId (for teacher details page)
    app.get("/enrollment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { classId: id };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // Post Assignment (Teacher dashboard)
    app.post("/assignment", async (req, res) => {
      const assignment = req.body;
      const result = await assignmentCollection.insertOne(assignment);
      res.send(result);
    });

    // get assignment for (teacher dashboard)
    app.get("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { classId: id };
      const result = await assignmentCollection.find(query).toArray();
      res.send(result);
    });

    // user feedback
    app.post("/feedback", async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    // Post assignment submission
    app.post("/assignmentSubmission", verifyToken, async (req, res) => {
      const assignment = req.body;
      const result = await assignmentSubmitCollection.insertOne(assignment);
      res.send(result);
    });

    // get assignment submissing by id
    app.get("/assignmentSubmission/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { classId: id };
      const result = await assignmentSubmitCollection.find(query).toArray();
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
