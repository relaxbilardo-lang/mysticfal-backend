const express = require("express")
const mongoose = require("mongoose");
const router = express.Router()

const User = require("../models/User")
const axios = require("axios")
const Fortune = require("../models/Fortune");



 const generateAIReading = require("../services/ai");

 const VALID_TYPES = ["coffee", "tarot", "dream", "horoscope", "star"];

  router.post("/", async (req, res) => {
  
  console.log("🔥 FORTUNE DB:", mongoose.connection.name);
  console.log("🔥 SEARCH USER ID:", req.body.userId);  
  console.log("🔥 NEW VERSION RUNNING");
  console.log("🔥 DB NAME:", mongoose.connection.name);
  console.log("🔥 SEARCH USER ID:", req.body.userId);
  console.log("FULL BODY:", req.body);

  try {
    const { type, userId, text, sign, birthDate } = req.body;

console.log("TYPE:", type);

// VALIDATION
if (!type || !userId) {
  return res.status(400).json({ error: "Eksik veri" });
}

if (!VALID_TYPES.includes(type)) {
  return res.status(400).json({ error: "Geçersiz fal tipi" });
}

// OBJECTID CHECK
if (!mongoose.Types.ObjectId.isValid(userId)) {
  console.log("❌ INVALID OBJECTID:", userId);
  return res.status(400).json({ error: "Geçersiz userId" });
}

// USER BUL
const user = await User.findById(userId);

console.log("🔥 FOUND USER:", user);

if (!user) {
  console.log("❌ USER DB'DE YOK:", userId);
  return res.status(404).json({ error: "User bulunamadı" });
}

// =======================
// 🔥 BURADAN SONRASI ARTIK ROUTE İÇİNDE
// =======================

// VIP kontrolü
const now = new Date();
const isVIP = user.vipExpiry
  ? (user.isVIP && user.vipExpiry > now)
  : false;

// günlük reset
if (user.lastUsageReset) {
  const last = new Date(user.lastUsageReset);
  const diff = now - last;
  const hours = diff / (1000 * 60 * 60);

  if (hours >= 24) {
    user.dailyUsage = 0;
    user.lastUsageReset = now;
  }
} else {
  user.lastUsageReset = now;
}
   // 💸 PAYWALL
user.dailyUsage += 1;

// 🔥 BURAYA KOY
 

console.log("💰 COIN BEFORE:", user.coins);
// 💰 COIN COST SYSTEM
let cost = 0;

if (type === "coffee") cost = 2;
if (type === "tarot") cost = 2;
if (type === "star") cost = 2;
if (type === "dream") cost = 2;
if (type === "love") cost = 2;
if (type === "horoscope") cost = 2;



// 🔥 TEST MODE - COIN SİSTEMİ TAM KAPALI
console.log("💰 COIN BEFORE:", user.coins);

// coin'i hep full tut
user.coins = 9999;

console.log("💰 COIN AFTER:", user.coins);

// 🔥 DEVAM NORMAL AKIŞ
let data = text || "";

// 🔥 HOROSCOPE FIX
if (type === "horoscope") {
  data = sign || text || "koç";
}

// 🔥 STAR FIX
if (type === "star") {
  data = birthDate || text || "bilinmiyor";
}
     // 🔥 AI CALL
let fortune;

console.log(`AI İşlemi Başladı: ${type} - Veri: ${data}`);

try {


  // 🔥 DATA FIX
  let finalData = data;

  if (!finalData || finalData === "") {
    finalData = type;
  }

  console.log(`AI isteği gönderiliyor... Tip: ${type}, Veri: ${finalData}`);
  console.log("🔥 AI FONKSİYONU ÇAĞRILIYOR...");
  console.log("🚨 TYPE:", type);
  console.log("🚨 FINAL DATA:", finalData);

  // 🔥 AI CALL
  fortune = await generateAIReading(type, finalData);

  console.log("🔥 AI SONUÇ:", fortune);

  // 🔥 KİLİT AÇ
 

  // 🔥 EXTRA GÜVENLİK (ARTIK THROW YOK)
  if (!fortune || fortune === "" || fortune === "null") {
    console.log("⚠️ AI boş döndü, fallback kullanıldı");

    fortune = type === "horoscope"
      ? JSON.stringify({
          general: "Bugün enerjiler dalgalı ama fırsatlar var.",
          love: "Aşk hayatında küçük sürprizler olabilir.",
          career: "İş tarafında dikkatli olmalısın.",
          money: "Harcamalarda kontrollü ol."
        })
      : "Enerjiler şu an net değil ama yakında açılacak.";
  }

  console.log("AI'dan yanıt başarıyla alındı ✅");

} catch (err) {
  console.error(`AI CALL ERROR (${type}):`, err.message);

  // 🔥 KİLİT AÇ (EN KRİTİK)
  global.isProcessing = false;

  fortune = type === "horoscope"
    ? JSON.stringify({
        general: "Şu an enerji karışık ama yakında toparlanacak.",
        love: "Aşk tarafında sabırlı ol.",
        career: "İş hayatında acele etme.",
        money: "Maddi konularda temkinli ol."
      })
    : "Şu an yorum alınamadı ama birazdan tekrar dene.";
}
// 🔥 JSON PARSE
let finalFortune;
if (type === "horoscope") {
  try {
    let clean = fortune;
    if (typeof fortune === "string") {
      clean = fortune
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
    }
    finalFortune = JSON.parse(clean);
  } catch (e) {
    console.error("JSON PARSE HATA (Ham metin gösterilecek):", e);
    finalFortune = {
      general: typeof fortune === "string" ? fortune : "Yorum işlenemedi",
      love: "-",
      career: "-",
      money: "-"
    };
  }
} else {
  finalFortune = fortune;
}

// 🔥 SAVE (USER + FORTUNE)
try {
  await user.save();

  // 1. Yeni falı veritabanına ekle
  try {
    await Fortune.create({
      userId: userId,
      type: type,
      result:
        typeof finalFortune === "string"
          ? finalFortune
          : JSON.stringify(finalFortune),
      question: text || sign || birthDate || "",
      createdAt: new Date(),
    });

    console.log("✅ FORTUNE SAVED");

  } catch (e) {
    console.log("❌ FORTUNE SAVE ERROR:", e.message);
  }

  // 2. SINIRLAMA MANTIĞI
  try {
    const allFortunes = await Fortune.find({ userId }).sort({ createdAt: -1 });

    if (allFortunes.length > 5) {
      const idsToDelete = allFortunes.slice(5).map(f => f._id);
      await Fortune.deleteMany({ _id: { $in: idsToDelete } });

      console.log(`🧹 Eski fallar silindi: ${idsToDelete.length}`);
    }
  } catch (e) {
    console.log("❌ CLEANUP ERROR:", e.message);
  }

  console.log("✅ SAVE BLOCK OK");

} catch (saveErr) {
  console.error("❌ USER SAVE ERROR:", saveErr.message);
}
  const requestId = Date.now();

res.json({
  success: true,

  // 🔥 ANA VERİ
  fortune: finalFortune,

  // 🔥 FRONTEND İÇİN GARANTİ TEXT
  text:
    typeof finalFortune === "string"
      ? finalFortune
      : finalFortune.general || JSON.stringify(finalFortune),

  requestId,
  debug: "BURAYA GELDI",

  // 🔥 DİĞERLERİ
  coins: user.coins,
  isVIP: isVIP,
  usage: user.dailyUsage,
  paywall: false,
});

} catch (err) {
  console.error("FORTUNE ROUTE ERROR:", err);
  res.status(500).json({ error: "Server error" });
}
});
// 🔥 HISTORY GET
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const fortunes = await Fortune.find({ userId })
      .sort({ createdAt: -1 }); // en yeni üstte

    res.json({
      success: true,
      data: fortunes,
    });

  } catch (err) {
    console.error("HISTORY ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;