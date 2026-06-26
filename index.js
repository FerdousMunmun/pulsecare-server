const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1']);
const Stripe = require("stripe");
const express = require("express");
const dontenv = require("dotenv");
dontenv.config();
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./lib/auth");

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");








const stripe = Stripe(
  process.env.STRIPE_SECRET_KEY
);
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();

const uri = process.env.MONGO_DB_URI;

const app = express();



const PORT = process.env.PORT || 5000;

app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL],
  }),
);
app.use(express.json());

app.use(cookieParser());
app.use("/api/auth", toNodeHandler(auth));

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyToken = (req, res, next) => {

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (err, decoded) => {

      if (err) {
        return res.status(401).send({
          message: "Unauthorized",
        });
      }

      req.user = decoded;

      next();

    }
  );

};

async function run() {
  try {
       console.log("Before Mongo Connect");
    await client.connect();


    console.log("MongoDB Connected");
    const database = client.db("pulsecare_db");
    


    const districtsCollection = database.collection("districts");
    const upazilasCollection = database.collection("upazilas");
    const donationRequestCollection = database.collection("donationRequests");
    const usersCollection = database.collection("user");
    const fundingCollection = database.collection("fundings");

    app.post(
  "/create-checkout-session",
  async (req, res) => {

    const { amount,email } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).send({
        success: false,
        message: "Invalid amount",
      });
    }
    const session =
      await stripe.checkout.sessions.create({

        customer_email: email,
        payment_method_types: [
          "card",
        ],

        mode: "payment",

        line_items: [
          {
            price_data: {
              currency: "usd",

              product_data: {
                name:
                  "PulseCare Donation",
              },

              unit_amount:
                amount * 100,
            },

            quantity: 1,
          },
        ],

        success_url:
          `${process.env.CLIENT_URL}/funding/success`,

        cancel_url:
         `${process.env.CLIENT_URL}/funding/cancel`,
      });

    res.send({
      url: session.url,
    });
  }
);





    app.get("/donation-requests",  async (req, res) => {
      const result = await donationRequestCollection
        .find({})
        .toArray();

      res.send(result);
    });


    app.get("/donation-requests/:id",verifyToken,   async (req, res) => {
      const id = req.params.id;

      const result =
        await donationRequestCollection.findOne({
          _id: new ObjectId(id),
        });

      res.send(result);
    });

    app.get("/dashboard-stats",   async (req, res) => {

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

console.log("Registering districts route...");

    app.get("/districts",   async (req, res) => {
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
      "/my-donation-requests/:email",  verifyToken,
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

app.post("/jwt", async (req, res) => {

  const user = req.body;

  const token = jwt.sign(
    user,
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
 .send({
      success: true,
    });


});

    app.get("/users",  async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });


    app.get("/users/:email",  async (req, res) => {
      const email = req.params.email;

      const user =
        await usersCollection.findOne({
          email,
        });

      res.send(user);
    });

    app.get("/fundings",   async (req, res) => {
      const result =
        await fundingCollection
          .find({})
          .sort({ fundingDate: -1 })
          .toArray();

      res.send(result);
    });

    app.get("/search-donors",   async (req, res) => {

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

app.get("/statistics",  verifyToken, async (req, res) => {
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

    app.post("/donation-requests",  verifyToken, async (req, res) => {
      console.log("BODY:", req.body);

      const result = await donationRequestCollection.insertOne(req.body);

      console.log("RESULT:", result);

      res.send(result);
    });


   app.post("/fundings",  verifyToken, async (req, res) => {

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
    app.delete("/donation-requests/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;

      const result = await donationRequestCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });


    app.patch("/donation-requests/:id",  verifyToken, async (req, res) => {
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
      "/donation-requests/:id/donate",  verifyToken,
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
      "/users/:id/status",  verifyToken,
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
      "/users/:id/role",  verifyToken,
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
    app.patch("/users/:id",  verifyToken, async (req, res) => {
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



    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch((err) => {
  console.error("RUN ERROR:", err);
});

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});



app.get("/check", (req, res) => {
  res.send("After run()");
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

module.exports = app;