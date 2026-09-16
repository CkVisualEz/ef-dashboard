import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();
const db = client.db("recommendation_db");

const domain = "engineeredfloors.com";
const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const encoded = domain.replace(/\./g, "[.%2E]");
const domainRe = new RegExp(`(?:https?://(?:www\\.)?${escaped}|${encoded}(?:%2F|/|$|\\?|&))`, "i");

const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");

const uiLookup = [
  {
    $lookup: {
      from: "ui_events",
      let: { uid: "$userId" },
      pipeline: [
        {
          $match: {
            cta_ui_version: { $in: ["v1", "v2"] },
            userId: { $ne: null },
            page_detail: { $regex: domainRe },
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
];

const withLookup = await db.collection("analytics").aggregate([
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
  ...uiLookup,
  { $group: { _id: "$abVariant", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();

const apiVersionOnly = await db.collection("analytics").aggregate([
  {
    $match: {
      sessionId: { $exists: true, $ne: null },
      userId: { $ne: null },
      api_version: { $in: ["v1", "v2"] },
      pageDetail: { $regex: domainRe },
      $expr: {
        $and: [
          { $gte: [{ $toDate: "$created_at" }, start] },
          { $lte: [{ $toDate: "$created_at" }, end] },
          { $gte: [{ $toDate: "$created_at" }, new Date("2026-08-24T09:24:17.180Z")] },
        ],
      },
    },
  },
  { $group: { _id: "$api_version", users: { $addToSet: "$userId" }, uploads: { $sum: 1 } } },
  { $project: { uploads: 1, count: { $size: "$users" } } },
]).toArray();

console.log("WITH ui_events lookup (correct AB logic):", withLookup);
console.log("WITH api_version only (stale server logic):", apiVersionOnly);

await client.close();
