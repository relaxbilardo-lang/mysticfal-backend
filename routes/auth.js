const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const nodemailer = require("nodemailer")

const User = require("../models/User")
const { info } = require("console")

// 🔥 BURAYA EKLE
const { Resend } = require("resend")
const resend = new Resend(process.env.RESEND_API_KEY)

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Eksik alan" })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: "Kullanıcı zaten var" })
    }

    const hashed = await bcrypt.hash(password, 10)
    const token = crypto.randomBytes(32).toString("hex")

    await User.create({
      userId: crypto.randomBytes(8).toString("hex"),
      email,
      password: hashed,
      verificationToken: token,
      isVerified: false,
    })

    const link = `myapp://reset?token=${token}`

    // 🔥 ÖNCE RESPONSE (hızlı UX)
    res.json({ message: "Mail gönderildi" })

    // 🔥 STANDARD MAIL (RESEND + DOMAIN)
    resend.emails.send({
      from: "MysticFal <no-reply@mysticfal.com.tr>",
      to: email,
      subject: "Hesabını Doğrula ✨",
      html: `
        <h2>Hesabını doğrula</h2>
        <p>Devam etmek için aşağıya tıkla:</p>
        <a href="${link}">Hesabı Doğrula</a>
      `,
    })
    .then((data) => {
      console.log("📩 MAIL OK:", data)
    })
    .catch((err) => {
      console.log("❌ MAIL ERROR:", err)
    })

  } catch (err) {
    console.log("❌ REGISTER ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})
// ================= VERIFY =================
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
    })

    if (!user) {
      return res.send("Geçersiz link ❌")
    }

    user.isVerified = true
    user.verificationToken = null
    await user.save()

    res.send("Hesabın doğrulandı ✅ Artık uygulamaya dönüp giriş yapabilirsin")

  } catch (err) {
    res.send("Hata oluştu ❌")
  }
})
// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Kullanıcı yok" })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(400).json({ message: "Şifre yanlış" })
    }

    // 🔥 VERIFY KONTROL
    if (!user.isVerified) {
      return res.status(403).json({ message: "Mail doğrula" })
    }

    const token = jwt.sign(
      { id: user._id },
      "SECRET_KEY",
      { expiresIn: "7d" }
    )

    res.json({
  success: true,
  token,
  user,
})

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ================= FORGOT PASSWORD =================
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

    await resend.emails.send({
      from: "MysticFal <no-reply@mysticfal.com.tr>",
      to: email,
      subject: "Şifre Sıfırlama",
      html: `
        <h2>Şifre sıfırlama</h2>
        <a href="${link}">Şifreyi Yenile</a>
      `,
    });

    res.json({ message: "Mail gönderildi" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= RESET PASSWORD =================
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

    res.json({ success: true, message: "Şifre güncellendi" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;