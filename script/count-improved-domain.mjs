import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();
const db = client.db("recommendation_db");

const domain = "engineeredfloors.com";
const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");
const dateExpr = {
  $and: [
    { $gte: [{ $toDate: "$created_at" }, start] },
    { $lte: [{ $toDate: "$created_at" }, end] },
  ],
};

const currentRe = new RegExp(`https?://(?:www\\.)?${domain.replace(/\./g, "\\.")}`, "i");
const improvedRe = new RegExp(
  `(?:https?://(?:www\\.)?${domain.replace(/\./g, "\\.")}|${domain.replace(/\./g, "[.%2E]")}(?:%2F|/|$|\\?|&))`,
  "i"
);

for (const [name, re] of [["current", currentRe], ["improved", improvedRe]]) {
  const rows = await db.collection("analytics").aggregate([
    {
      $match: {
        sessionId: { $exists: true, $ne: null },
        userId: { $ne: null },
        api_version: { $in: ["v1", "v2"] },
        pageDetail: { $regex: re },
        $expr: dateExpr,
      },
    },
    { $group: { _id: "$api_version", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
    { $project: { uploads: 1, count: { $size: "$users" } } },
  ]).toArray();
  console.log(name, rows);
}

await client.close();
