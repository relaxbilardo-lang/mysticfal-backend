const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // 🔥 ENV kontrol
    console.log("🔥 MONGO_URI:", process.env.MONGO_URI);

    if (!process.env.MONGO_URI) {
      console.log("❌ MONGO_URI YOK");
      process.exit(1);
    }

    // 🔥 ZORLA DOĞRU DB'YE BAĞLAN
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "mysticfal", // 💣 EN KRİTİK SATIR
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB CONNECTED → mysticfal");

    // 🔥 HANGİ DB'YE BAĞLANDIĞINI GÖR
    console.log("🔥 ACTIVE DB:", mongoose.connection.name);

  } catch (err) {
    console.error("❌ Mongo ERROR:", err);
    process.exit(1);
  }
};

module.exports = connectDB;