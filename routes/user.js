const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const Fortune = require("../models/Fortune");

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

     const imageUrl =
     `https://mysticfal-backend-production.up.railway.app/uploads/${req.file.filename}`;

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
        coins: user.coins || 0,
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
// 🗑 DELETE ACCOUNT
router.post("/delete-account", async (req, res) => {
  try {

    const { userId } = req.body;

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Kullanıcı bulunamadı",
      });
    }
       await Fortune.deleteMany({
  userId,
});

if (
  user.profileImage &&
  user.profileImage.includes(
    "/uploads/",
  )
) {

  const fileName =
    user.profileImage
      .split("/")
      .pop();

  const filePath =
    path.join(
      __dirname,
      "../uploads",
      fileName,
    );

  if (
    fs.existsSync(
      filePath,
    )
  ) {
    fs.unlinkSync(
      filePath,
    );
  }
}

await User.findByIdAndDelete(
  userId,
);
    return res.json({
      success: true,
      message:
        "Hesap silindi",
    });

  } catch (err) {

    console.log(
      "DELETE ERROR:",
      err,
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// 💰 ADD COINS
router.post(
"/add-coins",

async (
req,
res,
) => {

try {

const {
userId,
coins,
} = req.body;

const user =
await User.findById(
userId,
);

if(!user){

return res.json({
success:false,
message:
"Kullanıcı bulunamadı",
});

}

user.coins =
(user.coins || 0)
+ coins;

await user.save();

return res.json({

success:true,

coins:
user.coins,

});

}

catch(err){

console.log(
"ADD COINS ERROR",
err,
);

return res.json({

success:false,

error:
err.message,

});

}

});

module.exports = router;