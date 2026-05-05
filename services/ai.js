const OpenAI = require("openai");
const path = require("path");

// .env oku
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const generateAIReading = async (type, data = "") => {

  const prompts = {
    coffee: `Fincan yorumu: ${data}. Buna göre güçlü, akıcı ve etkileyici bir kahve falı yorumu yap.`,

    tarot: `Kartlar: ${data}. Bu kartları analiz et ve aşk, gelecek ve enerji üzerine Türkçe yorum yap.`,

    dream: `Rüya: ${data}. Bu rüyayı Türk geleneklerine göre detaylı ama akıcı şekilde yorumla.`,

    horoscope: `${data} burcu için günlük yorum yap. SADECE JSON formatında cevap ver:
{"general": "...", "love": "...", "career": "...", "money": "..."}`,

    star: `Doğum bilgileri: ${data}. Buna göre yıldızname analizi yap ve karakter + kader yorumu ver.`
  };

  const currentPrompt = prompts[type] || "Türkçe mistik bir fal yorumu yap.";

  console.log("🧠 PROMPT:", currentPrompt);

  try {
    const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "Sen profesyonel bir falcısın. Türkçe cevap ver." },
    { role: "user", content: currentPrompt }
  ],
});
    
 const result = completion.choices[0].message.content;

    console.log("🧠 RESULT:", result);

    // 🔥 HOROSCOPE PARSE
    if (type === "horoscope") {
      try {
        return JSON.stringify(JSON.parse(result));
      } catch (e) {
        console.log("JSON parse patladı, fallback çalıştı");

        return JSON.stringify({
          general: result,
          love: "-",
          career: "-",
          money: "-"
        });
      }
    }

    // 🔥 BOŞ KONTROL
    if (!result || result.trim() === "") {
      return type === "horoscope"
        ? JSON.stringify({
            general: "Yorum üretilemedi.",
            love: "-",
            career: "-",
            money: "-"
          })
        : "Yorum alınamadı.";
    }

    return result;

  } catch (error) {
    console.error("🔴 FULL AI ERROR:");
    console.error(error);
    console.error("MESSAGE:", error.message);
    console.error("STACK:", error.stack);

    return type === "horoscope"
      ? JSON.stringify({
          general: "Yorum alınamadı.",
          love: "-",
          career: "-",
          money: "-"
        })
      : "Yorum alınamadı.";
  }
};

module.exports = generateAIReading;