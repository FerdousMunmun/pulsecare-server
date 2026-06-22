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
const PORT = 5000;

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

  console.log("PATCH DATA:", req.body);

  const result = await donationRequestCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: req.body }
  );

  console.log("PATCH RESULT:", result);

  const updatedDoc = await donationRequestCollection.findOne({
    _id: new ObjectId(id),
  });

  console.log("UPDATED DOC:", updatedDoc);

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