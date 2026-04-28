const express = require("express")
const router = express.Router()
const User = require("../models/User")

router.post("/daily", async (req, res) => {
  try {
    const user = await User.findById(req.body.userId)

    const now = new Date()
    const last = new Date(user.lastDailyReward || 0)

    const diff = (now - last) / (1000 * 60 * 60)

    if (diff < 24) {
      return res.json({ success: false, message: "Zaten aldın" })
    }

    user.coins += 5
    user.lastDailyReward = now

    await user.save()

    res.json({ success: true, coins: user.coins })
  } catch (err) {
    res.status(500).json({ error: "Hata" })
  }
})

module.exports = router