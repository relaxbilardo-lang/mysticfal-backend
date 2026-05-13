require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/User");

// 🔥 SAFE RESEND INIT (CRASH ENGEL)
let resend = null;

if (process.env.RESEND_API_KEY) {
  const { Resend } = require("resend");
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log("📩 Resend aktif");
} else {
  console.log("⚠️ Resend API KEY yok - mail gönderimi kapalı");
}


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("REGISTER EMAIL:", email);
    if (!email || !password) {
      return res.status(400).json({
        message: "Eksik alan",
      });
    }

    const existing = await User.findOne({ email });
    console.log("EXISTING USER:", existing);
    if (existing) {
      return res.status(400).json({
        message: "Kullanıcı zaten var",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const token = crypto
      .randomBytes(32)
      .toString("hex");

    await User.create({
      userId: crypto.randomBytes(8).toString("hex"),
      email,
      password: hashed,
      verificationToken: token,
      isVerified: false,
    });

    // 🔥 GERÇEK VERIFY LINK
    const link =
      `https://mysticfal-backend-production.up.railway.app/api/auth/verify/${token}`;

    // 🔥 RESEND YOKSA
    if (!resend) {
      return res.status(500).json({
        message: "Mail sistemi aktif değil",
      });
    }

    // 🔥 MAIL GÖNDER
    const mailResult = await resend.emails.send({
    from: "MysticFal <onboarding@mysticfal.com.tr>",
      to: email,
      subject: "MysticFal Hesap Doğrulama ✨",
      html: `
        <h2>Hesabını doğrula</h2>

        <p>
          MysticFal hesabını aktifleştirmek için
          aşağıdaki butona tıkla.
        </p>

        <a href="${link}">
          Hesabı Doğrula
        </a>
      `,
    });

    console.log("📩 MAIL RESULT:", mailResult);

    return res.json({
      success: true,
      message: "Doğrulama maili gönderildi",
    });

  } catch (err) {
    console.log("❌ REGISTER ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
  // ================= VERIFY =================
    router.get("/verify/:token", async (req, res) => {
    try {

    const user = await User.findOne({
      verificationToken: req.params.token,
    });

    if (!user) {
      return res.send("Geçersiz link ❌");
    }

    user.isVerified = true;
    user.verificationToken = null;

    await user.save();

    res.send("Hesabın doğrulandı ✅");

  } catch (err) {
    console.log("VERIFY ERROR:", err);
    res.send("Hata oluştu ❌");
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Kullanıcı yok" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Şifre yanlış" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Mail doğrula" });
    }

    const token = jwt.sign(
      { id: user._id },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= FORGOT =================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "Eğer kayıtlıysa mail gönderildi" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15;
    await user.save();

    const link = `http://192.168.0.101:4000/api/auth/reset/${token}`;

    if (resend) {
      await resend.emails.send({
       from: "MysticFal <onboarding@mysticfal.com.tr>",
        to: email,
        subject: "Şifre Sıfırlama",
        html: `
          <h2>Şifre sıfırlama</h2>
          <a href="${link}">Şifreyi Yenile</a>
        `,
      });
    }

    res.json({ message: "Mail gönderildi" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RESET =================
router.post("/reset/:token", async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.json({ success: false, message: "Token geçersiz" });
    }

    const hashed = await bcrypt.hash(password, 10);

    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ================= OTP LOGIN =================
router.post("/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;

    console.log("📩 OTP BODY:", req.body);

    const cleanCode = String(otpCode).trim();

    if (cleanCode !== "1234") {
      return res.status(400).json({
        success: false,
        error: "Geçersiz kod",
      });
    }

    let user = await User.findOne({ phoneNumber });

    if (!user) {
      console.log("🔥 USER YOK → OLUŞTURULUYOR");

      user = await User.create({
        phoneNumber,
       userId: new mongoose.Types.ObjectId().toString(),
        coins: 10,
        isProfileCompleted: false,
      });
    }

    const token = jwt.sign(
      { id: user._id },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id.toString(),
        phoneNumber: user.phoneNumber,
        coins: user.coins,
      },
      isNewUser: !user.isProfileCompleted,
    });

  } catch (err) {
    console.error("🔥 OTP ERROR FULL:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ================= UPDATE PROFILE =================
router.post("/update-profile", async (req, res) => {
  try {

    const {
      userId,
      name,
      surname,
      birthDate,
      birthTime,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    user.name = name;
    user.surname = surname;
    user.birthDate = birthDate;
    user.birthTime = birthTime;
    user.isProfileCompleted = true;

    await user.save();

    return res.json({
      success: true,
      user,
    });

  } catch (err) {

    console.log(
      "UPDATE PROFILE ERROR:",
      err,
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


module.exports = router;