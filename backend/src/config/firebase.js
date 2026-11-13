const path = require("node:path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require(
  path.join(__dirname, "..", "..", "serviceAccountKey.json")
);

initializeApp({
  credential: cert(serviceAccount)
});

module.exports = {
  auth: getAuth(),
  db: getFirestore()
};
