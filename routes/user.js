const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const User = require("../models/User");

// 📸 STORAGE
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 🔥 AVATAR UPLOAD
router.post("/upload-avatar", upload.single("image"), async (req, res) => {
  try {
    const userId = req.body.userId;

    const imageUrl = `http://10.0.2.2:4000/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(userId, {
      profileImage: imageUrl,
    });

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// ================= PROFILE =================
router.post("/profile", async (req, res) => {
  try {

    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    return res.json({
      success: true,
      user: {
        name: user.name || "",
        surname: user.surname || "",
        birthDate: user.birthDate || "",
        birthTime: user.birthTime || "",
        zodiac: user.zodiac || "",
        profileImage: user.profileImage || "",
      },
    });

  } catch (err) {

    console.log(
      "PROFILE ERROR:",
      err,
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;