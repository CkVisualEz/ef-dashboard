import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URL;
const client = new MongoClient(url);
await client.connect();
const db = client.db("recommendation_db");

const domains = ["dwellingsef.com", "engineeredfloors.com"];
const start = new Date("2026-08-17T00:00:00Z");
const end = new Date("2026-09-16T23:59:59.999Z");

for (const domain of domains) {
  const re = new RegExp(`https?://(?:www\\.)?${domain.replace(/\./g, "\\.")}`, "i");
  const pageDetails = await db.collection("ui_events").distinct("page_detail", {
    page_detail: { $regex: re },
  });

  const assignOps = await db.collection("ui_events").aggregate([
    {
      $match: {
        page_detail: { $regex: re },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$created_at" }, start] },
            { $lte: [{ $toDate: "$created_at" }, end] },
          ],
        },
      },
    },
    { $group: { _id: "$operation", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ]).toArray();

  const servedAssign = await db.collection("ui_events").aggregate([
    {
      $match: {
        userId: { $ne: null },
        cta_ui_version: { $in: ["v1", "v2"] },
        page_detail: { $regex: re },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$created_at" }, start] },
            { $lte: [{ $toDate: "$created_at" }, end] },
          ],
        },
        operation: { $regex: /^cta_ab_assign/i },
      },
    },
    { $group: { _id: "$cta_ui_version", users: { $addToSet: "$userId" } } },
    { $project: { count: { $size: "$users" } } },
  ]).toArray();

  const allUiUsers = await db.collection("ui_events").aggregate([
    {
      $match: {
        userId: { $ne: null },
        cta_ui_version: { $in: ["v1", "v2"] },
        page_detail: { $regex: re },
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

  const analytics = await db.collection("analytics").aggregate([
    {
      $match: {
        sessionId: { $exists: true, $ne: null },
        userId: { $ne: null },
        api_version: { $in: ["v1", "v2"] },
        pageDetail: { $regex: re },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$created_at" }, start] },
            { $lte: [{ $toDate: "$created_at" }, end] },
          ],
        },
      },
    },
    { $group: { _id: "$api_version", uploads: { $sum: 1 }, users: { $addToSet: "$userId" } } },
    { $project: { uploads: 1, users: { $size: "$users" } } },
  ]).toArray();

  console.log(`\n=== ${domain} ===`);
  console.log("page_detail samples:", pageDetails.slice(0, 5));
  console.log("operations:", assignOps);
  console.log("served (cta_ab_assign):", servedAssign);
  console.log("all ui_events users by version:", allUiUsers);
  console.log("analytics:", analytics);
}

await client.close();
