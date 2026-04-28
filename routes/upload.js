const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");

// 📂 uploads klasörü
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// 📸 multer ayar
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// 🔥 SADE FİLTRE (AI yerine şimdilik basic)
function isUnsafe(filename) {
  const badWords = ["nude", "sex", "xxx"];
  return badWords.some(w => filename.toLowerCase().includes(w));
}

// 📸 UPLOAD ROUTE
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.json({ success: false, error: "Dosya yok" });
    }

    // 🔥 FAKE MODERATION (sonra AI bağlarız)
    if (isUnsafe(req.file.filename)) {
      fs.unlinkSync(req.file.path);
      return res.json({
        success: false,
        error: "Uygunsuz içerik",
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.json({ success: false, error: "User yok" });
    }

    user.profileImage = req.file.filename;
    await user.save();

    res.json({
      success: true,
      image: req.file.filename,
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Upload hata" });
  }
});

module.exports = router;