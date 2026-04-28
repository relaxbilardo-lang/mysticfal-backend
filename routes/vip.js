const express = require("express")
const router = express.Router()

// 👇 FAKE DB (AYNI)
let users = {
  "1": {
    coins: 100,
    isVIP: false,
    vipExpire: null,
  }
}

router.post("/buy", (req, res) => {
  const { userId } = req.body

  if (!users[userId]) {
    users[userId] = {
      coins: 50,
      isVIP: false,
      vipExpire: null,
    }
  }

  const now = new Date()
  const expire = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  users[userId].isVIP = true
  users[userId].vipExpire = expire

  return res.json({
    success: true,
    message: "VIP aktif 🎉",
    expire,
  })
})

module.exports = router