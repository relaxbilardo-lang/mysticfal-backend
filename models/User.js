const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // 🔥 Şifreleme kütüphanesini ekledik

const userSchema = new mongoose.Schema({
  // Giriş ve Kimlik Bilgileri
  phoneNumber: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },

  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },

  // 🔥 RESET PASSWORD
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },

  // 💰 COIN & SİSTEM
  coins: { type: Number, default: 10 },
  totalEarnedCoins: { type: Number, default: 0 },

  // 📸 PROFİL FOTO
  profileImage: { 
    type: String, 
    default: "" 
  },

  // 🎁 İLK FAL ÜCRETSİZ
  freeUsed: { type: Boolean, default: false },

  // 🔥 BURÇ SİSTEMİ
  horoscopeUsed: { type: Boolean, default: false },
  horoscopeDate: { type: String, default: "" },

  // 👤 PROFİL
  name: { type: String, default: "" },
  birthDate: { type: String, default: "" },
  birthTime: { type: String, default: "" },
  isProfileCompleted: { type: Boolean, default: false },

  // 👑 VIP
  isVIP: { type: Boolean, default: false },
  vipExpiry: { type: Date, default: null },

  // 🎁 ÖDÜL
  lastDailyReward: { type: Date, default: null },
  streakCount: { type: Number, default: 0 },
  lastStreakDate: { type: Date, default: null },

  // 📊 LIMIT
  dailyUsage: { type: Number, default: 0 },
  lastUsageReset: { type: Date, default: null },
}, { timestamps: true });

// 🔥 ÖNEMLİ: Şifre Değiştiğinde Otomatik Şifreleme Mekanizması
userSchema.pre("save", async function (next) {
  // Eğer şifre alanında bir değişiklik yoksa şifrelemeyi atla
  if (!this.isModified("password")) return next();

  try {
    // Şifreyi 10 salt turu ile güvenli hale getir
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
