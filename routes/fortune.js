const express = require("express")
const router = express.Router()

const User = require("../models/User")
const axios = require("axios")


const generateAIReading = require("../services/ai");
//const Fortune = require("../models/Fortune") 

const VALID_TYPES = ["coffee", "tarot", "dream", "horoscope" , "star"];

router.post("/", async (req, res) => {
  console.log("FULL BODY:", req.body);
  try {
    const { type, userId, text, sign, birthDate } = req.body
    console.log("TYPE:", type);
    if (!type || !userId) {
      return res.status(400).json({ error: "Eksik veri" })
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Geçersiz fal tipi" })
    }
    
        
          
 // 🔥 KULLANICI KONTROLÜ VE FIX
let user;

try {
  user = await User.findOne({ userId: userId });

  if (!user) {
    return res.status(404).json({ error: "User bulunamadı" });
  }

  // 🔥 TEST İÇİN COIN FULL
  user.coins = 9999;
  await user.save();

} catch (err) {
  console.error("DB Hatası:", err.message);
  return res.status(500).json({ error: "DB hatası" });
}

const now = new Date();

// VIP kontrolü
const isVIP = user.vipExpiry
  ? (user.isVIP && user.vipExpiry > now)
  : false;

    // 🔁 günlük reset
    if (user.lastUsageReset) {
      const last = new Date(user.lastUsageReset)
      const diff = now - last
      const hours = diff / (1000 * 60 * 60)

      if (hours >= 24) {
        user.dailyUsage = 0
        user.lastUsageReset = now
      }
    } else {
      user.lastUsageReset = now
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

// 🔥 SAVE (USER + FORTUNE) - 3 ADET SINIRLAMA DAHİL
try {
  await user.save();

  // 1. Yeni falı veritabanına ekle
  await Fortune.create({
    userId: userId,
    type: type,
    result: typeof finalFortune === "string"
      ? finalFortune
      : JSON.stringify(finalFortune),
    question: text || sign || birthDate || "",
    createdAt: new Date()
  });

  // 2. SINIRLAMA MANTIĞI: Kullanıcının tüm fallarını tarihe göre çek (en yeni üstte)
  const allFortunes = await Fortune.find({ userId }).sort({ createdAt: -1 });

  // 3. Eğer 3'ten fazla fal varsa, 3. indisten sonrakileri sil
  if (allFortunes.length > 5) {
    const idsToDelete = allFortunes.slice(5).map(f => f._id);
    await Fortune.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`✅ Eski fallar silindi. Silinen adet: ${idsToDelete.length}`);
  }

  console.log("✅ FORTUNE SAVED & LIMITED TO 5");

} catch (saveErr) {
  console.error("Kayıt hatası:", saveErr.message);
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