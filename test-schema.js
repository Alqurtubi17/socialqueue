require('dotenv').config();

const key = process.env.GEMINI_API_KEY;
const userPrompt = `Buat 2 post dengan newline.`;
const systemPrompt = `Kamu copywriter.`;

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { 
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          posts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                content: { type: 'STRING' },
                variants: { type: 'ARRAY', items: { type: 'STRING' } }
              }
            }
          }
        }
      }
    }
  })
}).then(r => r.json()).then(data => {
  console.log(data);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log(text);
  console.log('Valid JSON?', !!JSON.parse(text));
}).catch(console.error);
