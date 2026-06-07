const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  coins: { type: Number, default: 10 },
  totalEarnedCoins: { type: Number, default: 0 },
  profileImage: { type: String, default: "" },
  freeUsed: { type: Boolean, default: false },
  horoscopeUsed: { type: Boolean, default: false },
  horoscopeDate: { type: String, default: "" },
  name: { type: String, default: "" },
  birthDate: { type: String, default: "" },
  birthTime: { type: String, default: "" },
  isProfileCompleted: { type: Boolean, default: false },
  isVIP: { type: Boolean, default: false },
  vipExpiry: { type: Date, default: null },
  lastDailyReward: { type: Date, default: null },
  streakCount: { type: Number, default: 0 },
  lastStreakDate: { type: Date, default: null },
  dailyUsage: { type: Number, default: 0 },
  lastUsageReset: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
