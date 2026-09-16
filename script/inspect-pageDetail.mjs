import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();
const db = client.db("recommendation_db");

const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");
const dateExpr = {
  $and: [
    { $gte: [{ $toDate: "$created_at" }, start] },
    { $lte: [{ $toDate: "$created_at" }, end] },
  ],
};

const base = {
  sessionId: { $exists: true, $ne: null },
  userId: { $ne: null },
  api_version: { $in: ["v1", "v2"] },
  $expr: dateExpr,
};

const direct = await db.collection("analytics").countDocuments({
  ...base,
  pageDetail: { $regex: /engineeredfloors\.com/i },
});

const wrapper = await db.collection("analytics").countDocuments({
  ...base,
  pageDetail: { $regex: /getrara\.ai.*engineeredfloors|engineeredfloors.*getrara/i },
});

const either = await db.collection("analytics").countDocuments({
  ...base,
  pageDetail: { $regex: /engineeredfloors\.com/i },
});

const encoded = await db.collection("analytics").countDocuments({
  ...base,
  pageDetail: { $regex: /engineeredfloors(%2E|\.)(com|%2F)/i },
});

console.log("Direct engineeredfloors.com in pageDetail:", direct);
console.log("Encoded/wrapper patterns:", encoded);

const samples = await db.collection("analytics").aggregate([
  { $match: base },
  { $group: { _id: { $substr: ["$pageDetail", 0, 60] }, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 15 },
]).toArray();
console.log("\nTop pageDetail prefixes:");
samples.forEach((s) => console.log(s.count, s._id));

// Users with api_version who have pageDetail containing ef domain (any form)
const efUsers = await db.collection("analytics").aggregate([
  {
    $match: {
      ...base,
      pageDetail: { $regex: /engineeredfloors/i },
    },
  },
  { $group: { _id: "$api_version", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();
console.log("\nAnalytics with engineeredfloors anywhere in pageDetail:", efUsers);

// Check if ui_events assign time correlates with analytics without userId - impossible

// Alternative join: same userId prefix timestamp? unlikely

// What % of ui_events users have cta_ab_assign vs cta_ab_assigned_v1
const ops = await db.collection("ui_events").aggregate([
  { $match: { page_detail: { $regex: /engineeredfloors\.com/i }, $expr: dateExpr } },
  { $group: { _id: "$operation", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]).toArray();
console.log("\nui_events operations:", ops);

await client.close();
