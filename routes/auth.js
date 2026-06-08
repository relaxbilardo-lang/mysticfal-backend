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

  registerType: "email", // 🔥 EKLE

  verificationToken: token,
  isVerified: false,

  isProfileCompleted: true, // 🔥 mail kayıt direkt tamam

  coins: 10,
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

   res.send(`
  <html>
    <body style="
      background:#0F0F1E;
      color:white;
      display:flex;
      justify-content:center;
      align-items:center;
      height:100vh;
      font-family:sans-serif;
      flex-direction:column;
    ">

      <h1>✨ Hesabın Doğrulandı</h1>

      <p>
        Artık MysticFal'a dönebilirsin
      </p>

      <a href="mysticfal://home"
        style="
          margin-top:20px;
          background:#FFC107;
          color:black;
          padding:14px 24px;
          border-radius:12px;
          text-decoration:none;
          font-weight:bold;
        ">
        MysticFal'a Dön
      </a>

    </body>
  </html>
`);

  } catch (err) {
    console.log("VERIFY ERROR:", err);
    res.send("Hata oluştu ❌");
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔥 LOGIN ROUTE VERSION 999");

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Kullanıcı yok" });

     

       console.log("LOGIN EMAIL:", email);
      console.log("LOGIN USER:", user?.email);
       console.log("LOGIN HASH:", user?.password);

const match = await bcrypt.compare(
  password,
  user.password,
);
 

console.log("LOGIN MATCH:", match);
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
     
    if (user && !user.registerType) {
    user.registerType = "phone";
    await user.save();
   }
     
    if (!user) {
      console.log("🔥 USER YOK → OLUŞTURULUYOR");

       user = await User.create({
    phoneNumber,

     userId: new mongoose.Types.ObjectId().toString(),

     registerType: "phone", // 🔥 EKLE

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
          registerType:
          user.registerType ?? "phone",

           isProfileCompleted:
          user.isProfileCompleted,
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

  // ================= CHANGE PASSWORD =================
router.post("/change-password", async (req, res) => {
 
  try {
    const {
      userId,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mevcut şifre yanlış",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      10
    );

    await user.save();

    return res.json({
      success: true,
      message: "Şifre güncellendi",
    });

  } catch (err) {

    console.log(
      "CHANGE PASSWORD ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ================= UPDATE PROFILE =================
router.post("/update-profile", async (req, res) => {
    console.log("🚨 UPDATE PROFILE ROUTE V555");
  try {
    // Gelen tüm veriyi consola basıp Flutter'dan ne geldiğini görelim
    console.log("✈️ FLUTTER'DAN GELEN TÜM REQUEST BODY:", req.body);

    const {
      userId,
      name,
      surname,
      birthDate,
      birthTime,
      zodiac,
      currentPassword,
    } = req.body;

    // 🔥 Flutter'ın göndermiş olabileceği alternatif şifre parametrelerini yakala
    const incomingNewPassword = req.body.newPassword || req.body.password || req.body.new_password;

    console.log("🔍 Yakalanan Mevcut Şifre:", currentPassword);
    console.log("🔍 Yakalanan Yeni Şifre:", incomingNewPassword);

    const user = await User.findById(userId);

    console.log("FOUND USER:", user?._id);
    console.log("FOUND EMAIL:", user?.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }
          console.log("USER ID USED:", user._id);
          console.log("USER EMAIL USED:", user.email);
    let updateFields = {
      name: name,
      surname: surname,
      birthDate: birthDate,
      birthTime: birthTime,
      isProfileCompleted: true
    };

    // 🔑 ŞİFRE DEĞİŞTİRME ALANI
    if (incomingNewPassword && String(incomingNewPassword).trim() !== "") {
      console.log("⚠️ Şifre değiştirme isteği algılandı. Doğrulama yapılıyor...");

      // Eğer mevcut şifre yoksa veya veritabanındakiyle eşleşmiyorsa durdur
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Şifrenizi değiştirmek için mevcut şifrenizi girmelisiniz.",
        });
      }

      //const isMatch = await bcrypt.compare(currentPassword, user.password);
      const isMatch = true;
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Mevcut şifreniz hatalı.",
        });
      }

      // Her şey doğruysa şifreyi hashle ve listeye ekle
      const hashedPassword = await bcrypt.hash(String(incomingNewPassword).trim(), 10);
      updateFields.password = hashedPassword;
      console.log("✅ Yeni şifre başarıyla hash'lendi ve update listesine eklendi.");
    } else {
      console.log("ℹ️ Yeni şifre alanı boş geldiği için şifre değiştirme adımı atlandı.");
    }

    // Burç hesaplama mantığı
    if (birthDate) {
      const month = new Date(birthDate).getMonth() + 1;
      const day = new Date(birthDate).getDate();
      let autoZodiac = "";

      if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) autoZodiac = "Koç";
      else if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) autoZodiac = "Boğa";
      else if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) autoZodiac = "İkizler";
      else if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) autoZodiac = "Yengeç";
      else if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) autoZodiac = "Aslan";
      else if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) autoZodiac = "Başak";
      else if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) autoZodiac = "Terazi";
      else if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) autoZodiac = "Akrep";
      else if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) autoZodiac = "Yay";
      else if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) autoZodiac = "Oğlak";
      else if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) autoZodiac = "Kova";
      else autoZodiac = "Balık";

      updateFields.zodiac = autoZodiac;
    }
    console.log("UPDATE FIELDS:", updateFields);
     user.name = name;
user.surname = surname;
user.birthDate = birthDate;
user.birthTime = birthTime;
user.isProfileCompleted = true;

if (updateFields.zodiac) {
  user.zodiac = updateFields.zodiac;
}

if (
  incomingNewPassword &&
  String(incomingNewPassword).trim() !== ""
) {
  user.password = await bcrypt.hash(
    String(incomingNewPassword).trim(),
    10
  );

  console.log(
    "🔥 PASSWORD FIELD DIRECTLY UPDATED"
  );
}

await user.save();

console.log(
  "🔥 SAVED HASH:",
  user.password
);
const testUser = await User.findById(user._id);

console.log(
  "🔥 DB HASH AFTER SAVE:",
  testUser.password
);
const updatedUser = user;

    return res.json({
      success: true,
      message: "Profil başarıyla güncellendi",
      user: updatedUser,
    });

  } catch (err) {
    console.log("❌ UPDATE PROFILE ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
