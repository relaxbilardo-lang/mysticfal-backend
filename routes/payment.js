const express = require("express");
const router = express.Router();

const { verifyPayment } = require("../services/google");
const User = require("../models/User");

// 👑 GOOGLE PLAY ÖDEME VERIFY
router.post("/google", async (req, res) => {
  try {
    const { token, productId, userId } = req.body;

    if (!token || !productId || !userId) {
      return res.status(400).json({ error: "Missing data" });
    }

    const result = await verifyPayment(token, productId);

    if (result.purchaseState === 0) {
      // ✅ USER BUL / OLUŞTUR
      let user = await User.findOne({ userId });

      if (!user) {
        user = await User.create({ userId, coins: 0 });
      }

      // 🔥 PRODUCT LOGIC
      let addedCoins = 0;

      // 💰 AYLIK COIN PAKETİ
      if (productId === "coin_monthly") {
        addedCoins = 100;
        user.coins += addedCoins;
      }

      // 👑 VIP (İSTERSEN KALSIN)
      if (productId === "vip_monthly") {
        const now = new Date();
        const expiry = new Date(now);
        expiry.setDate(expiry.getDate() + 30);

        user.isVIP = true;
        user.vipExpiry = expiry;
      }

      await user.save();

      return res.json({
        success: true,
        coins: user.coins,
        addedCoins,
        isVIP: user.isVIP || false,
        vipExpiry: user.vipExpiry || null,
      });

    } else {
      return res.status(400).json({
        error: "Payment invalid",
      });
    }

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({
      error: "Verification failed",
    });
  }
});

module.exports = router;