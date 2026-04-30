const mongoose = require("mongoose");

const fortuneSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  result: { type: String, required: true },
  question: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Fortune", fortuneSchema);