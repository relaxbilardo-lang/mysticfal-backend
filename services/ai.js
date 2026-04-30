const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateAIReading = async (type, data = "") => {
  const styles = [
    "duygusal",
    "tutkulu",
    "derin analiz yapan",
    "gizemli",
    "romantik ama gerçekçi",
  ];

  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  const prompts = {
    coffee: `Fincan yorumu: ${data}. Buna göre güçlü, akıcı ve etkileyici bir kahve falı yorumu yap.`,

    tarot: `Kartlar: ${data}. Bu kartları analiz et ve aşk, gelecek ve enerji üzerine Türkçe yorum yap.`,

    dream: `Rüya: ${data}. Bu rüyayı Türk geleneklerine göre detaylı ama akıcı şekilde yorumla.`,

    love: `
Sen ${randomStyle} bir ilişki analistisin.

İki kişi arasındaki aşk uyumunu analiz et.

Kurallar:
- Yoruma "Merhaba," diye başla
- En az 3 paragraf yaz
- Her yorum farklı olsun
- Duygusal ve gerçekçi ol
- Tekrar eden cümleler kullanma

Bilgiler:
${data}
`,

    horoscope: `${data} burcu için günlük yorum yap. SADECE JSON formatında cevap ver:
{"general": "...", "love": "...", "career": "...", "money": "..."}`,

    star: `
Sen profesyonel bir astrologsun.

Doğum tarihi ve saati: ${data}

Kişi hakkında detaylı yıldızname analizi yap.

Kurallar:
- Yoruma "Merhaba," diye başla
- En az 3 paragraf yaz
- Akıcı ve mistik ol
- Aşk, karakter ve gelecek analiz et
- Tekrar eden cümle kullanma
- Türkçe yaz

Detaylı analiz yap.
`
  };

  const currentPrompt = prompts[type] || "Türkçe mistik bir fal yorumu yap.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 1.0,
      top_p: 0.95,
      messages: [
        { role: "system", content: "Sen profesyonel bir falcısın. Türkçe cevap ver." },
        { role: "user", content: currentPrompt }
      ],
    });

    const result = completion.choices[0].message.content;

    if (type === "horoscope") {
      try {
        return JSON.stringify(JSON.parse(result));
      } catch (e) {
        return JSON.stringify({
          general: result,
          love: "-",
          career: "-",
          money: "-"
        });
      }
    }

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
    console.error("🔴 AI ERROR:", error.message);

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