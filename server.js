require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");

console.log("MONGO_URI:", process.env.MONGO_URI);


// 🔥 OPENAI INIT (KRİTİK)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mongoose = require("mongoose");
const uploadRoute = require("./routes/upload");
const authRoutes = require("./routes/auth");

// ✅ DB & MODELS
const connectDB = require("./config/db");
const User = require("./models/User");



// ✅ ROUTES
const fortuneRoutes = require("./routes/fortune");
const vipRoutes = require("./routes/vip");
const paymentRoutes = require("./routes/payment");
const dailyRoutes = require("./routes/daily");
const coinRoutes = require("./routes/coin")

const app = express();

// ✅ DB BAĞLANTISI
connectDB();

// ✅ MIDDLEWARE
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

// 🔮 BURÇ HESAPLAMA YARDIMCISI
function getZodiacSign(day, month) {
  if ((month == 3 && day >= 21) || (month == 4 && day <= 20)) return "aries";
  if ((month == 4 && day >= 21) || (month == 5 && day <= 21)) return "taurus";
  if ((month == 5 && day >= 22) || (month == 6 && day <= 22)) return "gemini";
  if ((month == 6 && day >= 23) || (month == 7 && day <= 22)) return "cancer";
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "leo";
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "virgo";
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "libra";
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "scorpio";
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return "sagittarius";
  if ((month == 12 && day >= 22) || (month == 1 && day <= 21)) return "capricorn";
  if ((month == 1 && day >= 22) || (month == 2 && day <= 19)) return "aquarius";
  return "pisces";
}

       // ✉️ [YENİ] E-POSTA İLE GİRİŞ & KAYIT ENDPOINT'I
          app.post("/api/auth/email-login", async (req, res) => {
          try {
            let { email, password } = req.body;

            if (!email || !password) {
              return res.status(400).json({
                success: false,
                error: "Email ve şifre gerekli"
              });
            }

            email = email.toLowerCase().trim();
            password = password.trim();

            let user = await User.findOne({ email });

            
             // 🆕 YENİ KULLANICI
      if (!user) {
      console.log("🔥 USER YOK → CREATE EDİLİYOR");
        user = await User.create({
    email,
    password, // 🔥 şimdilik plain (ileride bcrypt)
    userId: email,
    phoneNumber: "EMAIL_USER_" + Date.now(),
    isProfileCompleted: false,
    coins: 10,

    // 🔥 BURAYA EKLEDİK
    isVerified: false,
    verificationToken: Math.random().toString(36).substring(2)
  });

  return res.json({
    success: true,
    isNewUser: true,
    userId: user.userId
  });
}


     // 🔐 ŞİFRE KONTROL
     if (user.password !== password) {
      return res.status(400).json({
        success: false,
        error: "Hatalı şifre"
      });
    }

    res.json({
      success: true,
      isNewUser: !user.isProfileCompleted,
       userId: user.userId
    });

  } catch (err) {
    console.error("EMAIL LOGIN HATASI:", err);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası"
    });
  }
});
       // 📱 OTP GÖNDER
       app.post("/api/auth/send-otp", async (req, res) => {
        const { phoneNumber } = req.body;

        console.log("OTP gönderiliyor:", phoneNumber);

        return res.json({
          success: true,
          otp: "1234"
        });
      });

      app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    console.log("Giriş denemesi:", phoneNumber, "Kod:", otpCode);

    // 1️⃣ OTP kontrol
const cleanCode = String(otpCode).trim();

console.log("🔥 RAW OTP:", otpCode);
console.log("🔥 CLEAN OTP:", cleanCode);

if (cleanCode !== "1234") {
  return res.status(400).json({
    success: false,
    error: "Geçersiz kod",
  });
}
    // 2️⃣ USER BUL
    let user = await User.findOne({ phoneNumber });

    // 3️⃣ YOKSA OLUŞTUR
    if (!user) {
      console.log("🔥 USER YOK → OLUŞTURULUYOR");

      user = await User.create({
        phoneNumber,
        coins: 10,
        isProfileCompleted: false,
      });
    }

      console.log("🔥 CREATED USER:", user);

      console.log("🔥 OTP DB:", mongoose.connection.name);
      console.log("🔥 CREATED USER ID:", user._id.toString());
    // 4️⃣ TOKEN
    const token = jwt.sign(
      { id: user._id },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    // 5️⃣ RESPONSE 💣 EN KRİTİK KISIM
    res.json({
      success: true,
      token,
      user: {
        _id: user._id.toString(), // 🔥 TEK DOĞRU ID
        phoneNumber: user.phoneNumber,
        coins: user.coins,
      },
      isNewUser: !user.isProfileCompleted,
    });

  } catch (err) {
    console.error("VERIFY-OTP HATASI:", err);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
});

// 📝 [YENİ] PROFİL GÜNCELLEME
app.post("/api/auth/update-profile", async (req, res) => {
  const { userId, name, birthDate, birthTime } = req.body;

  try {
    const user = await User.findByIdAndUpdate(userId, {
      name,
      birthDate,
      birthTime,
      isProfileCompleted: true
    }, { new: true });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: "Güncelleme hatası" });
  }
});

// 🎁 DAILY REWARD (COIN SİSTEMİ)
app.post("/api/daily-reward", async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, error: "User yok" });
    }

    const today = new Date().toDateString();
    const last = user.lastDailyReward
      ? new Date(user.lastDailyReward).toDateString()
      : null;

    // ❌ aynı gün alma
    if (today === last) {
      return res.json({
        success: false,
        message: "Bugün zaten aldın",
        coins: user.coins,
      });
    }

    // 🔁 streak hesapla
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const lastStreak = user.lastStreakDate
      ? new Date(user.lastStreakDate).toDateString()
      : null;

    if (lastStreak === yesterday.toDateString()) {
      user.streakCount += 1;
    } else {
      user.streakCount = 1;
    }

    // 💰 ödül tablosu
    const rewards = [1, 2, 3, 4, 5, 8, 10];
    const index = Math.min(user.streakCount - 1, 6);
    const reward = rewards[index];

    user.coins += reward;
    user.totalEarnedCoins += reward;

    user.lastDailyReward = new Date();
    user.lastStreakDate = new Date();

    if (user.streakCount >= 7) {
      user.streakCount = 0;
    }

    await user.save();

    res.json({
      success: true,
      coins: user.coins,
      reward,
      streak: user.streakCount,
    });

  } catch (e) {
    console.error("DAILY REWARD HATA:", e);
    res.json({ success: false, error: "Sunucu hatası" });
  }
});

app.post("/api/love", async (req, res) => {
  const { name1, name2 } = req.body;

  const combined = (name1 + name2)
    .toLowerCase()
    .split("")
    .reduce((a, b) => a + b.charCodeAt(0), 0);

  let score = (combined % 61) + 40;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${name1} ve ${name2} aşk uyumu %${score}. Türkçe ve kısa yorum yap.`,
        },
      ],
    });

    return res.json({
      success: true,
      score,
      comment: completion.choices[0].message.content,
    });

  } catch (err) {
    console.error("OPENAI HATA:", err);

    return res.json({
      success: true,
      score,
      comment: "Enerji güzel görünüyor ✨",
    });
  }
}); // 🔥 route burada düzgün kapanıyor


// ✅ ROUTE KULLANIMLARI & ERROR HANDLING
app.use("/api/fortune", fortuneRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/daily", dailyRoutes);
app.use("/api/coin", coinRoutes);
app.use("/api/upload", uploadRoute);
app.use("/api/auth", authRoutes);
app.use("/api/user", require("./routes/user"));

app.use((req, res) =>
  res.status(404).json({ error: "Yol bulunamadı" })
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server port: ${PORT}`);
});