const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 🎁 DAILY REWARD
router.post("/daily-reward", async (req, res) => {
  try {
    console.log("📩 BODY:", req.body);

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Eksik userId" });
    }

    // 🔥 SADECE BU (KRİTİK)
    let user = await User.findOne({ userId });

    if (!user) {
      return res.json({ success: false, error: "User yok" });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (user.lastDailyReward) {
      const last = new Date(user.lastDailyReward);
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());

      const diffDays = (today - lastDay) / (1000 * 60 * 60 * 24);

      if (diffDays === 0) {
        return res.json({
          success: false,
          error: "Bugün zaten aldın ⏳",
          coins: user.coins,
        });
      }
    }

    let streak = user.streakCount || 0;

    if (user.lastStreakDate) {
      const last = new Date(user.lastStreakDate);
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());

      const diffDays = (today - lastDay) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    const rewards = [1, 2, 3, 4, 5, 8, 10];
    const index = Math.min(streak - 1, 6);
    let reward = rewards[index];

    if (streak === 7) {
      reward = 10;
      streak = 0;
    }

    user.coins = (user.coins || 0) + reward;
    user.totalEarnedCoins = (user.totalEarnedCoins || 0) + reward;

    user.lastDailyReward = now;
    user.lastStreakDate = now;
    user.streakCount = streak;

    await user.save();

    res.json({
      success: true,
      coins: user.coins,
      reward,
      streak,
    });

  } catch (err) {
    console.error("🔥 DAILY ERROR FULL:", err); // 👈 KRİTİK
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;