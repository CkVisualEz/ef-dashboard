import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URL;
const client = new MongoClient(url);
await client.connect();
const db = client.db("recommendation_db");

const UI_EVENTS = "ui_events";
const ANALYTICS = "analytics";
const AB_VARIANTS = ["v1", "v2"];
const UI_EVENT_ASSIGNED_REGEX = /^cta_ab_assign/i;

const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");

function domainRe(domain) {
  return new RegExp(`https?://(?:www\\.)?${domain.replace(/\./g, "\\.")}`, "i");
}

async function getScopedAnalytics(domain) {
  const re = domainRe(domain);
  const assignedUsers = await db.collection(UI_EVENTS).aggregate([
    {
      $match: {
        userId: { $ne: null },
        cta_ui_version: { $in: AB_VARIANTS },
        page_detail: { $regex: re },
        operation: { $regex: UI_EVENT_ASSIGNED_REGEX },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$created_at" }, start] },
            { $lte: [{ $toDate: "$created_at" }, end] },
          ],
        },
      },
    },
    { $group: { _id: "$cta_ui_version", users: { $addToSet: "$userId" } } },
  ]).toArray();

  const userMap = new Map();
  for (const row of assignedUsers) {
    userMap.set(row._id, new Set(row.users));
  }

  const analytics = await db.collection(ANALYTICS).aggregate([
    {
      $match: {
        sessionId: { $exists: true, $ne: null },
        userId: { $ne: null },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$created_at" }, start] },
            { $lte: [{ $toDate: "$created_at" }, end] },
          ],
        },
      },
    },
    {
      $lookup: {
        from: UI_EVENTS,
        let: { uid: "$userId" },
        pipeline: [
          {
            $match: {
              cta_ui_version: { $in: AB_VARIANTS },
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
    {
      $group: {
        _id: "$abVariant",
        uploads: { $sum: 1 },
        users: { $addToSet: "$userId" },
      },
    },
    { $project: { uploads: 1, users: { $size: "$users" } } },
  ]).toArray();

  const served = await db.collection(UI_EVENTS).aggregate([
    {
      $match: {
        userId: { $ne: null },
        cta_ui_version: { $in: AB_VARIANTS },
        page_detail: { $regex: re },
        operation: { $regex: UI_EVENT_ASSIGNED_REGEX },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$created_at" }, start] },
            { $lte: [{ $toDate: "$created_at" }, end] },
          ],
        },
      },
    },
    { $group: { _id: "$cta_ui_version", users: { $addToSet: "$userId" } } },
    { $project: { count: { $size: "$users" } } },
  ]).toArray();

  return { served, scopedAnalytics: analytics, assignedUserCounts: Object.fromEntries(
    [...userMap.entries()].map(([k, v]) => [k, v.size])
  ) };
}

for (const domain of ["dwellingsef.com", "engineeredfloors.com"]) {
  const result = await getScopedAnalytics(domain);
  console.log(`\n=== ${domain} (scoped) ===`);
  console.log("served:", result.served);
  console.log("scoped analytics:", result.scopedAnalytics);
}

await client.close();
