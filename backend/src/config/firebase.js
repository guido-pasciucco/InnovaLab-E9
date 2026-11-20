const path = require("node:path");
const fs = require("node:fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const localCredentialsPath = path.join(
  __dirname,
  "..",
  "..",
  "serviceAccountKey.json"
);
const credentialsPath = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || localCredentialsPath
);

if (!fs.existsSync(credentialsPath)) {
  throw new Error(
    `Firebase service account file not found at "${credentialsPath}". ` +
    "Set GOOGLE_APPLICATION_CREDENTIALS to the credential file path."
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

initializeApp({ credential: cert(serviceAccount) });

module.exports = {
  auth: getAuth(),
  db: getFirestore()
};
