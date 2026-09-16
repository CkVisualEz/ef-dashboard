import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URL;
const client = new MongoClient(url);
await client.connect();
const db = client.db("recommendation_db");

const domain = "engineeredfloors.com";
const re = new RegExp(`https?://(?:www\\.)?${domain.replace(/\./g, "\\.")}`, "i");
const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");

const dateExpr = {
  $and: [
    { $gte: [{ $toDate: "$created_at" }, start] },
    { $lte: [{ $toDate: "$created_at" }, end] },
  ],
};

console.log("\n=== UI_EVENTS (cta_ab_assign, domain, date range) ===");
const served = await db.collection("ui_events").aggregate([
  {
    $match: {
      operation: { $regex: /^cta_ab_assign/i },
      cta_ui_version: { $in: ["v1", "v2"] },
      userId: { $ne: null },
      page_detail: { $regex: re },
      $expr: dateExpr,
    },
  },
  { $group: { _id: "$cta_ui_version", users: { $addToSet: "$userId" }, events: { $sum: 1 } } },
  { $project: { events: 1, count: { $size: "$users" } } },
]).toArray();
console.log(served);

const uiUserIds = await db.collection("ui_events").distinct("userId", {
  operation: { $regex: /^cta_ab_assign/i },
  cta_ui_version: { $in: ["v1", "v2"] },
  page_detail: { $regex: re },
  $expr: dateExpr,
});

console.log("\nUnique ui_events assign users in range:", uiUserIds.length);

console.log("\n=== ANALYTICS (domain pageDetail, date range) ===");
const analyticsDomain = await db.collection("analytics").aggregate([
  {
    $match: {
      sessionId: { $exists: true, $ne: null },
      userId: { $ne: null },
      pageDetail: { $regex: re },
      $expr: dateExpr,
    },
  },
  { $group: { _id: "$api_version", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();
console.log(analyticsDomain);

const analyticsUserIds = await db.collection("analytics").distinct("userId", {
  sessionId: { $exists: true, $ne: null },
  pageDetail: { $regex: re },
  $expr: dateExpr,
});
console.log("Unique analytics users (domain filter):", analyticsUserIds.length);

const uiSet = new Set(uiUserIds.map(String));
const overlap = analyticsUserIds.filter((u) => uiSet.has(String(u)));
console.log("\nUserId overlap (ui assign ∩ analytics domain):", overlap.length);

console.log("\n=== ANALYTICS users who match ANY ui_events user (no domain on analytics) ===");
const overlapAny = await db.collection("analytics").aggregate([
  {
    $match: {
      sessionId: { $exists: true, $ne: null },
      userId: { $in: uiUserIds },
      $expr: dateExpr,
    },
  },
  { $group: { _id: null, users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();
console.log(overlapAny);

console.log("\n=== AFTER first ui_events entry (current server logic) ===");
const afterFirst = await db.collection("analytics").aggregate([
  {
    $match: {
      sessionId: { $exists: true, $ne: null },
      userId: { $ne: null },
      $expr: dateExpr,
    },
  },
  {
    $lookup: {
      from: "ui_events",
      let: { uid: "$userId" },
      pipeline: [
        {
          $match: {
            cta_ui_version: { $in: ["v1", "v2"] },
            userId: { $ne: null },
            page_detail: { $regex: re },
            $expr: { $eq: ["$userId", "$$uid"] },
          },
        },
        { $sort: { created_at: 1 } },
        { $limit: 1 },
        { $project: { cta_ui_version: 1, firstUiEventAt: "$created_at" } },
      ],
      as: "_abEntry",
    },
  },
  { $match: { "_abEntry.0": { $exists: true } } },
  {
    $addFields: {
      abVariant: { $toLower: { $arrayElemAt: ["$_abEntry.cta_ui_version", 0] } },
      firstUiEventAt: { $arrayElemAt: ["$_abEntry.firstUiEventAt", 0] },
    },
  },
  {
    $match: {
      $expr: { $gte: [{ $toDate: "$created_at" }, { $toDate: "$firstUiEventAt" }] },
    },
  },
  { $group: { _id: "$abVariant", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();
console.log(afterFirst);

console.log("\n=== Sample userId formats ===");
const uiSample = await db.collection("ui_events").findOne({ page_detail: { $regex: re } }, { projection: { userId: 1 } });
const anSample = await db.collection("analytics").findOne({ pageDetail: { $regex: re } }, { projection: { userId: 1, sessionId: 1 } });
console.log("ui_events userId:", uiSample?.userId, typeof uiSample?.userId);
console.log("analytics userId:", anSample?.userId, typeof anSample?.userId);

console.log("\n=== Users with ui assign but ZERO analytics after first entry ===");
const noAnalytics = await db.collection("ui_events").aggregate([
  {
    $match: {
      operation: { $regex: /^cta_ab_assign/i },
      page_detail: { $regex: re },
      userId: { $ne: null },
      $expr: dateExpr,
    },
  },
  { $group: { _id: "$userId", firstAssign: { $min: "$created_at" }, version: { $first: "$cta_ui_version" } } },
  {
    $lookup: {
      from: "analytics",
      let: { uid: "$_id", firstAt: "$firstAssign" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$userId", "$$uid"] },
                { $gte: [{ $toDate: "$created_at" }, { $toDate: "$$firstAt" }] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: "hasAnalytics",
    },
  },
  { $match: { hasAnalytics: { $size: 0 } } },
  { $count: "usersWithNoAnalytics" },
]).toArray();
console.log(noAnalytics);

console.log("\n=== Users with ui assign AND analytics after first entry ===");
const withAnalytics = await db.collection("ui_events").aggregate([
  {
    $match: {
      operation: { $regex: /^cta_ab_assign/i },
      page_detail: { $regex: re },
      userId: { $ne: null },
      $expr: dateExpr,
    },
  },
  { $group: { _id: "$userId", firstAssign: { $min: "$created_at" }, version: { $first: "$cta_ui_version" } } },
  {
    $lookup: {
      from: "analytics",
      let: { uid: "$_id", firstAt: "$firstAssign" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$userId", "$$uid"] },
                { $gte: [{ $toDate: "$created_at" }, { $toDate: "$$firstAt" }] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: "hasAnalytics",
    },
  },
  { $match: { "hasAnalytics.0": { $exists: true } } },
  { $group: { _id: "$version", count: { $sum: 1 } } },
]).toArray();
console.log(withAnalytics);

await client.close();
