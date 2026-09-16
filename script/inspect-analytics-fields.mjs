import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URL);
await client.connect();
const db = client.db("recommendation_db");

const re = /engineeredfloors\.com/i;
const uiUsers = await db.collection("ui_events").distinct("userId", {
  operation: { $regex: /^cta_ab_assign/i },
  page_detail: { $regex: re },
});
const uiSet = new Set(uiUsers.map(String));

const anDocs = await db.collection("analytics")
  .find({ pageDetail: { $regex: re } })
  .limit(5)
  .toArray();

console.log("Sample analytics doc keys:", Object.keys(anDocs[0] || {}));
console.log(JSON.stringify(anDocs[0], null, 2).slice(0, 2500));

// Find overlapping user full doc
const overlap = anDocs.find((d) => uiSet.has(String(d.userId)));
if (!overlap) {
  const one = await db.collection("analytics").findOne({ userId: { $in: uiUsers.slice(0, 100) } });
  console.log("\nOverlap doc:", JSON.stringify(one, null, 2).slice(0, 2500));
}

// Check all string fields in analytics for ui userId pattern
const sampleUiId = uiUsers[0];
const inAnyField = await db.collection("analytics").countDocuments({
  $or: [
    { userId: sampleUiId },
    { sessionId: sampleUiId },
    { pageDetail: { $regex: sampleUiId } },
  ],
});
console.log("\nAnalytics refs to sample ui userId", sampleUiId, ":", inAnyField);

await client.close();
