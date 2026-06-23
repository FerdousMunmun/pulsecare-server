const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1']); 

const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();
console.log("CLIENT_URL =", process.env.CLIENT_URL);
const uri = process.env.MONGO_DB_URI;
console.log(process.env.MONGO_DB_URI);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL],
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    


    const database = client.db("pulsecare_db");   
    console.log("DB Name:", database.databaseName);

    
const districtsCollection =  database.collection("districts");
const upazilasCollection = database.collection("upazilas");
const donationRequestCollection = database.collection("donationRequests");
const usersCollection = database.collection("user");





 app.get("/donation-requests", async (req, res) => {
  const result = await donationRequestCollection
    .find({})
    .toArray();

  res.send(result);
});


app.get("/donation-requests/:id", async (req, res) => {
  const id = req.params.id;

  const result =
    await donationRequestCollection.findOne({
      _id: new ObjectId(id),
    });

  res.send(result);
});

app.get("/dashboard-stats", async (req, res) => {
  const totalDonors = await usersCollection.countDocuments({
    role: "donor",
  });

  const totalRequests =
    await donationRequestCollection.countDocuments();

  const totalFunding = 0;

  res.send({
    totalDonors,
    totalRequests,
    totalFunding,
  });
});



  app.get("/districts", async (req, res) => {
  const result = await districtsCollection
    .find({})
    .toArray();

  res.send(result);
});

app.get("/districts/:id/upazilas", async (req, res) => {
  const districtId = req.params.id;

  const result = await upazilasCollection
    .find({
      district_id: districtId,
    })
    .toArray();

  res.send(result);
});

app.get(
  "/my-donation-requests/:email",
  async (req, res) => {

    const email = req.params.email;

    const result =
      await donationRequestCollection
      .find({
        requesterEmail: email,
      })
      .toArray();


    res.send(result);

  }
);



app.get("/users", async (req, res) => {
  const users = await usersCollection.find().toArray();
  res.send(users);
});
app.post("/donation-requests", async (req, res) => {
  console.log("BODY:", req.body);

  const result = await donationRequestCollection.insertOne(req.body);

  console.log("RESULT:", result);

  res.send(result);
});
app.delete("/donation-requests/:id", async (req, res) => {
  const id = req.params.id;

  const result = await donationRequestCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});


app.patch("/donation-requests/:id", async (req, res) => {
  const id = req.params.id;

  const result = await donationRequestCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: req.body }
  );

  const updatedDoc = await donationRequestCollection.findOne({
    _id: new ObjectId(id),
  });


  res.send(result);
});


app.patch(
  "/donation-requests/:id/donate",
  async (req, res) => {

    const id = req.params.id;

    const donorInfo = req.body;


    const result =
      await donationRequestCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            status: "inprogress",

            donorName:
              donorInfo.donorName,

            donorEmail:
              donorInfo.donorEmail,
          },
        }
      );


    res.send(result);
  }
);


app.patch(
  "/donation-requests/:id/status",
  async (req, res) => {

    const id = req.params.id;

    const { status } =
      req.body;

    const result =
      await donationRequestCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            status,
          },
        }
      );

    res.send(result);

  }
);
app.patch(
  "/users/:id/status",
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result =
      await usersCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: { status },
        }
      );

    res.send(result);
  }
);


 

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});