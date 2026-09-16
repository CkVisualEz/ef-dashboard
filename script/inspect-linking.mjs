import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();
const db = client.db("recommendation_db");
const re = /engineeredfloors\.com/i;

const uiSample = await db.collection("ui_events").findOne({ page_detail: { $regex: re } });
const anSample = await db.collection("analytics").findOne({ pageDetail: { $regex: re } });

console.log("ui_events fields:", Object.keys(uiSample || {}));
console.log("ui_events sample:", JSON.stringify(uiSample, null, 2));
console.log("analytics sample:", JSON.stringify({
  userId: anSample?.userId,
  sessionId: anSample?.sessionId,
  api_version: anSample?.api_version,
  client_id: anSample?.client_id,
  pageDetail: anSample?.pageDetail,
}, null, 2));

const uiHasSession = await db.collection("ui_events").countDocuments({ sessionId: { $exists: true, $ne: null } });
const uiTotal = await db.collection("ui_events").countDocuments({});
console.log("ui_events with sessionId:", uiHasSession, "/", uiTotal);

const anUsers = await db.collection("analytics").distinct("userId", { pageDetail: { $regex: re }, userId: { $ne: null } });
const uiUsers = await db.collection("ui_events").distinct("userId", { page_detail: { $regex: re }, userId: { $ne: null } });
const uiSet = new Set(uiUsers.map(String));
const overlapAllTime = anUsers.filter((u) => uiSet.has(String(u)));
console.log("All-time overlap userId:", overlapAllTime.length, "analytics:", anUsers.length, "ui:", uiUsers.length);

// Match by api_version from analytics vs cta_ui_version from ui_events for overlapping users
if (overlapAllTime.length > 0) {
  const uid = overlapAllTime[0];
  const ui = await db.collection("ui_events").find({ userId: uid, page_detail: { $regex: re } }).sort({ created_at: 1 }).limit(3).toArray();
  const an = await db.collection("analytics").find({ userId: uid }).sort({ created_at: 1 }).limit(3).toArray();
  console.log("\nOverlap user example:", uid);
  console.log("ui versions:", ui.map((x) => ({ op: x.operation, v: x.cta_ui_version, at: x.created_at })));
  console.log("an versions:", an.map((x) => ({ v: x.api_version, at: x.created_at, page: x.pageDetail?.slice(0, 60) })));
}

// How many ui assign users have ANY analytics (any time)?
const assignUsers = await db.collection("ui_events").distinct("userId", {
  operation: { $regex: /^cta_ab_assign/i },
  page_detail: { $regex: re },
  userId: { $ne: null },
});
const assignSet = new Set(assignUsers.map(String));
const anAllUsers = await db.collection("analytics").distinct("userId", { userId: { $ne: null } });
const overlapEver = anAllUsers.filter((u) => assignSet.has(String(u)));
console.log("\nAssign users with ANY analytics ever:", overlapEver.length, "/", assignUsers.length);

// Conversion funnel realistic numbers if we used api_version from analytics for users on domain only
const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");
const dateExpr = {
  $and: [
    { $gte: [{ $toDate: "$created_at" }, start] },
    { $lte: [{ $toDate: "$created_at" }, end] },
  ],
};

const analyticsOnly = await db.collection("analytics").aggregate([
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
console.log("\nAnalytics-only (pageDetail domain + api_version):", analyticsOnly);

await client.close();
