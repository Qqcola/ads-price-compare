const {genai} = require("@google/genai");
const Items = require('../models/Items');

// const ai = new genai({ apiKey: ""});

async function itemsRag(userText, limit=10) {
  try {
    const pipeline = [
      { $match: { $text: { $search: userText } } },
      { $addFields: { score: { $meta: "textScore" } } },
      { $sort: { score: -1 } },
      { $limit: limit }
    ];

    const results = await Items.aggregate(pipeline);
    return results;
  } catch (err) {
    console.error(err);
    return '';
  }
}

exports.inference = async (req, res) => {
  try {
    const userText = req.body.query.trim();
    if (!userText) return res.status(200).json({ statusCode: 200, data: [], message: 'No query provided' });
    let limit = parseInt(req.query.limit || '5', 10);
    let content = await itemsRag(userText, limit=limit);
    // console.log(content[0]['general_information'])
    // content = content.json['data'][0]['general_information']
    // const prompt = ""
    
    // const response = await ai.models.generateContent({
    //     model: "gemini-2.0-flash",
    //     content: prompt
    // })
    return res.json({ statusCode: 200, data: content[0]['general_information'], message: 'Success' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ statusCode: 500, message: 'Server error', error: err.message });
  }
};

// exports.test = async (req, res) => {
//   res.json({ statusCode: 200, data: {'Check': 1}, message: 'Success' });
// };
