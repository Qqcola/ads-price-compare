import { createRequire } from "module";
const require = createRequire(import.meta.url);

require("dotenv").config();
const Items = require("../models/Items");
const template = require("../template/prompt_template.json");

import { GoogleGenAI } from "@google/genai";

const list_api_key = process.env.API_KEYS.split(",");
const split_index = list_api_key.length % 2 ? Math.trunc(list_api_key.length / 2) : Math.trunc(list_api_key.length / 2) + 1;
const inference_models = list_api_key.slice(0, split_index).map((key) => new GoogleGenAI({ apiKey: key }));
const intent_models = list_api_key.slice(split_index).map((key) => new GoogleGenAI({ apiKey: key }));
const model_name = process.env.MODEL_NAME;

async function itemsRag(userText, limit = 5) {
  try {
    const pipeline = [
      { $match: { $text: { $search: userText } } },
      { $addFields: { score: { $meta: "textScore" } } },
      { $sort: { score: -1 } },
      { $limit: limit },
    ];

    const results = await Items.aggregate(pipeline);
    // console.log(results)
    return results;
  } catch (err) {
    console.error(err);
    return "";
  }
}

async function intentClassification(userText, historyPrompt) {
  const prompt = template["intent"].replace("<Conversation history>", historyPrompt).replace("<User query>", userText);
  console.log(prompt)
  for (let i = 0; i < intent_models.length; i++) {
    try {
      let intent = await intent_models[i].models.generateContent({
        model: model_name,
        contents: prompt,
      });
      console.log(intent.text);
      return intent.text.match(/\*\*Decision\*\*:\s*\*([^*]+)\*/)[1] == "Yes" ? 1 : 0;
    } catch (err) {
      console.error(err);
    }
  }
  return 0;
}

export const inference = async (req, res) => {
  try {
    const userText = req.body.query.trim();
    let conversationHistory = req.body.history;
    if (!userText) return res.status(200).json({statusCode: 200, data: "Server error", message: "No query provided"});

    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (res.flushHeaders) res.flushHeaders();
    }

    if (!conversationHistory) conversationHistory = [];
    var historyPrompt = "";
    if (conversationHistory.length != 0) {
      for (let i= 0; i < conversationHistory.length; i++) {
        let mess = conversationHistory[i];
        historyPrompt += `${mess[0]}: ${mess[1]}\n`;
      }
    }
    // console.log("Check", historyPrompt)
    const intent = await intentClassification(userText, historyPrompt);
    var context = "";
    // console.log(intent)
    if (intent == 1) {
      const list_items = await itemsRag(userText);
      for (let i = 0; i < list_items.length; i++){
        let it = list_items[i];
        let price_cm = 'price' in it ? it['price']['chemist_warehouse'] : 'None';
        context += `${i + 1}. **Item name***: ${it['name']}.\n***Information***: ${it['general_information']}.\n***Directions***: ${it['directions']}.\n***Price***: Chemist Warehouse - ${price_cm}`
        if (price_cm != 'None' && 'chemist_outlet' in it['price']) {
          context += `, Chemist Outlet - ${it['price']['chemist_outlet']}`;
        }
        context += `\n`;
      }
    }
    for (let i = 0; i < inference_models.length; i++) {
      try {
        let streamingResult = await inference_models[i].models.generateContentStream({
          model: model_name,
          contents: template["answer"].replace("<Conversation history>", historyPrompt).replace("<Context>", context).replace("<User query>", userText),
        });
        for await (const chunk of streamingResult) {
          const text = chunk.text;
          if (res.writableEnded) break;
          if (text) {
            // console.log(chunk.text)
            res.write(JSON.stringify({ type: 'chunk', text }) + '\n');
          }
        }
        const finalResp = streamingResult.response ? await streamingResult.response : null;
        const finalText = finalResp?.candidates?.[0]?.content ?? null;
        if (finalText) {
          res.write(JSON.stringify({ type: 'done', text: finalText }) + '\n');
        }
        res.end();
        return;
      } catch (err) {
        console.error(err);
      }
    }
    // return res.json({ statusCode: 200, data: "Server error", message: "Success" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ statusCode: 500, message: "Server error", error: err.message });
  }
};

// exports.test = async (req, res) => {
//   res.json({ statusCode: 200, data: {'Check': 1}, message: 'Success' });
// };
export default { inference };
