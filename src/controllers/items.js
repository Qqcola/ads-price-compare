const Items = require("../models/Items");

exports.itemsSearch = async (req, res) => {
  const q = (req.query.q || "").trim();
  const limit = Math.max(
    1,
    Math.min(parseInt(req.query.limit || "200", 10), 2000)
  );
  if (!q) return res.json([]);

  try {
    // Basic case-insensitive regex search on common fields
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    // console.log(rx)
    const docs = await Items.aggregate(
      [
        {
          $match: {
            $or: [
              { name: rx },
              { brand: rx },
            ],
          },
        },
        {
          $limit: limit,
        },
      ],
      { maxTimeMS: 3000 }
    );
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.itemsTrending = async (_req, res) => {
  try {
    const docs = await Items.aggregate([{ $sample: { size: 16 } }]);
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch trending" });
  }
};
