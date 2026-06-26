const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_DB_URI);

const db = client.db("pulsecare_db");


const auth = betterAuth({

     baseURL: process.env.BETTER_AUTH_URL,
     trustedOrigins: [
    process.env.CLIENT_URL,
  ],
  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "donor",
      },
      status: {
        type: "string",
        defaultValue: "active",
      },
      bloodGroup: {
        type: "string",
      },
      district: {
        type: "string",
      },
      upazila: {
        type: "string",
      },
      image: {
        type: "string",
      },
    },
  },

  database: mongodbAdapter(db, {
    client,
  }),
});

module.exports = { auth };

console.log("AUTH:", auth);