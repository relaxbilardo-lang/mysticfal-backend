const { google } = require("googleapis");

const serviceAccount = JSON.parse(
  process.env.GOOGLE_SERVICE_ACCOUNT
);

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

const androidpublisher = google.androidpublisher({
  version: "v3",
  auth,
});

const verifyPayment = async (token, productId) => {
  const res = await androidpublisher.purchases.products.get({
    packageName: "com.mysticfal.mobile",
    productId,
    token,
  });

  return res.data;
};

module.exports = { verifyPayment };