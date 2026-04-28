const mongoose = require("mongoose");

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

  // 📸 PROFİL FOTO (🔥 BURASI ÖNEMLİ)
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

module.exports = mongoose.model("User", userSchema);