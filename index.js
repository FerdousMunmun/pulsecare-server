const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

// start point
const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dontenv.config();
const app = express();
const PORT = process.env.PORT;
app.use(express.json());

app.use(cors())





app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

// mongodb start
const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


// jwt create

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);


const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    next();
  } catch (error) {
    console.log(error);

    return res.status(403).json({
      msg: "Unauthorized"
    });
  }
};
const donorVerify = async (req, res, next) => {
  const user = req.user;
  if (user.role !== "donor") {
    return res.status(403).json({ msg: "Forbidden" });
  }
  next();
};

async function run() {
  try {

    await client.connect();

    // mongodbcollection
    console.log("MongoDB Connected");
    const db = client.db("pulsecare_db");



    const districtsCollection = db.collection("districts");
    const upazilasCollection = db.collection("upazilas");
    const donationRequestCollection = db.collection("donationRequests");
    const usersCollection = db.collection("user");
    const fundingCollection = db.collection("fundings");
    const subscriptionsCollection = db.collection("subscription");






    app.get("/donation-requests", async (req, res) => {
      const result = await donationRequestCollection
        .find({})
        .toArray();

      res.send(result);
    });


    app.get("/donation-requests/:id",verifyToken, async (req, res) => {
      const id = req.params.id;

      const result =
        await donationRequestCollection.findOne({
          _id: new ObjectId(id),
        });

      res.send(result);
    });

    app.get("/dashboard-stats", async (req, res) => {

      const totalDonors =
        await usersCollection.countDocuments({
          role: "donor",
        });

      const totalRequests =
        await donationRequestCollection.countDocuments();

      const fundings =
        await fundingCollection.find().toArray();

      const totalFunding =
        fundings.reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );

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
      "/my-donation-requests/:email",verifyToken,
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



    app.get("/users", verifyToken, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });


    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const user =
        await usersCollection.findOne({
          email,
        });

      res.send(user);
    });

    app.get("/fundings",  verifyToken, async (req, res) => {
      const result =
        await subscriptionsCollection
          .find({})
          .sort({ fundingDate: -1 })
          .toArray();

      res.send(result);
    });

    app.get("/search-donors", async (req, res) => {

      try {

        const {
          bloodGroup,
          district,
          upazila,
        } = req.query;

        const query = {
          role: "donor",
          status: "active",
        };

        if (bloodGroup) {
          query.bloodGroup = bloodGroup;
        }

        if (district) {
          query.district = district;
        }

        if (upazila) {
          query.upazila = upazila;
        }

        const donors =
          await usersCollection
            .find(query)
            .toArray();

        res.send(donors);

      } catch (error) {

        res.status(500).send({
          message: error.message,
        });

      }

    });

    app.get("/statistics", async (req, res) => {
      try {
        const activeDonors = await usersCollection.countDocuments({
          role: "donor",
          status: "active",
        });

        const bloodRequests =
          await donationRequestCollection.countDocuments();

        const bloodDonations =
          await donationRequestCollection.countDocuments({
            status: "done",
          });

        res.send({
          activeDonors,
          bloodRequests,
          bloodDonations,
        });
      } catch (error) {
        res.status(500).send({
          message: error.message,
        });
      }
    });

    app.post("/donation-requests", verifyToken, async (req, res) => {
      console.log("BODY:", req.body);

      const result = await donationRequestCollection.insertOne(req.body);

      console.log("RESULT:", result);

      res.send(result);
    });


    app.post("/fundings",verifyToken, async (req, res) => {

      const fundingData = req.body;

      if (
        !fundingData.amount ||
        Number(fundingData.amount) <= 0
      ) {
        return res.status(400).send({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      const result =
        await fundingCollection.insertOne(fundingData);

      res.send(result);
    });
    app.delete("/donation-requests/:id",verifyToken, async (req, res) => {
      const id = req.params.id;

      const result = await donationRequestCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });


    app.patch("/donation-requests/:id",verifyToken, async (req, res) => {
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
      "/donation-requests/:id/donate",verifyToken,
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
      "/donation-requests/:id/status",  verifyToken,
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
      "/users/:id/status",verifyToken,
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

    app.patch(
      "/users/:id/role",verifyToken,
      async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;

        const result =
          await usersCollection.updateOne(
            {
              _id: new ObjectId(id),
            },
            {
              $set: { role },
            }
          );

        res.send(result);
      }
    );
    app.patch("/users/:id",verifyToken, async (req, res) => {
      const id = req.params.id;

      const updatedData = req.body;

      const result =
        await usersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updatedData,
          }
        );

      res.send(result);
    });
    // tearcermaking 
    app.post("/subscription", async (req, res) => {
      const {
        sessionId,
        userId,
        userName,
        userEmail,
        amount,
      } = req.body;

      const isExit = await subscriptionsCollection.findOne({
        sessionId,
      });

      if (isExit) {
        return res.json({
          msg: "Already exit!",
        });
      }

      await subscriptionsCollection.insertOne({
        sessionId,
        userId,
        userName,
        userEmail,
        amount,
        fundingDate: new Date(),
      });

      res.json({
        msg: "Payment successful",
      });
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.error);









