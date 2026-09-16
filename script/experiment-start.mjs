import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();
const db = client.db("recommendation_db");
const re = /engineeredfloors\.com/i;

const first = await db.collection("ui_events").findOne(
  { operation: { $regex: /^cta_ab_assign/i }, page_detail: { $regex: re } },
  { sort: { created_at: 1 }, projection: { created_at: 1 } }
);
console.log("First assign:", first?.created_at);

const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");
const expStart = new Date(first.created_at);

const rows = await db.collection("analytics").aggregate([
  {
    $match: {
      sessionId: { $exists: true, $ne: null },
      api_version: { $in: ["v1", "v2"] },
      pageDetail: { $regex: re },
      $expr: {
        $and: [
          { $gte: [{ $toDate: "$created_at" }, start] },
          { $lte: [{ $toDate: "$created_at" }, end] },
          { $gte: [{ $toDate: "$created_at" }, expStart] },
        ],
      },
    },
  },
  { $group: { _id: "$api_version", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();
console.log("Analytics after experiment start:", rows);

await client.close();
