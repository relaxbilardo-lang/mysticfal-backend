const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "google-service-account.json",
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

const androidpublisher = google.androidpublisher({
  version: "v3",
  auth,
});

const verifyPayment = async (token, productId) => {
  const res = await androidpublisher.purchases.products.get({
    packageName: "com.mysticfal.mobile",
    productId: productId,
    token: token,
  });

  return res.data;
};

module.exports = { verifyPayment };