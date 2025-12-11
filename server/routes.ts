import type { Express, Request, Response } from "express";
import { Server } from "http";
import { getDatabase } from "./db";

export async function registerRoutes(server: Server, app: Express) {
  const FEATURES_COLLECTION = process.env.NEW_FEATURES_COLLECTION || "ef_features";
  const PRODUCTS_COLLECTION = process.env.NEW_PRODUCTS_COLLECTION || "ef_products";

  // Helper to parse query filters
  const parseFilters = (req: Request) => {
    const { startDate, endDate, classification, device, state, city } = req.query;
    const filters: any = {};

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate as string);
      if (endDate) filters.createdAt.$lte = new Date(endDate as string);
    }

    if (classification) {
      filters.classification = classification;
    }

    if (device) {
      filters.deviceType = device;
    }

    if (state) {
      filters["userLocation.state"] = state;
    }

    if (city) {
      filters["userLocation.city"] = city;
    }

    return filters;
  };

  // GET /api/overview
  app.get("/api/overview", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      // Total users (unique sessionIds)
      const totalUsers = await features.distinct("sessionId", filters);

      // Total uploads
      const totalUploads = await features.countDocuments(filters);

      // Total clicks (count searchResults arrays that have items)
      const clicksAgg = await features.aggregate([
        { $match: filters },
        { $unwind: "$searchResults" },
        { $count: "total" }
      ]).toArray();
      const totalClicks = clicksAgg[0]?.total || 0;

      // Uploads by classification
      const classificationStats = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$classification",
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Device breakdown
      const deviceStats = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$deviceType",
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Upload trends (last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const trendData = await features.aggregate([
        {
          $match: {
            ...filters,
            createdAt: { $gte: twoWeeksAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              classification: "$classification"
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]).toArray();

      res.json({
        kpis: {
          totalUsers: totalUsers.length,
          totalUploads,
          avgUploadsPerUser: totalUsers.length > 0 ? (totalUploads / totalUsers.length).toFixed(1) : 0,
          totalClicks,
          clickRate: totalUploads > 0 ? ((totalClicks / totalUploads) * 100).toFixed(1) : 0,
        },
        classificationStats,
        deviceStats,
        trendData
      });
    } catch (error) {
      console.error("Error in /api/overview:", error);
      res.status(500).json({ error: "Failed to fetch overview data" });
    }
  });

  // GET /api/returning-users
  app.get("/api/returning-users", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      // Get user upload frequency
      const userFrequency = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$sessionId",
            uploadCount: { $sum: 1 },
            firstUpload: { $min: "$createdAt" },
            lastUpload: { $max: "$createdAt" }
          }
        }
      ]).toArray();

      // Categorize users
      const newUsers = userFrequency.filter((u: any) => u.uploadCount === 1).length;
      const returningUsers = userFrequency.filter((u: any) => u.uploadCount > 1).length;
      const totalUsers = newUsers + returningUsers;

      // Upload frequency distribution
      const frequencyDist = {
        "1": userFrequency.filter((u: any) => u.uploadCount === 1).length,
        "2-3": userFrequency.filter((u: any) => u.uploadCount >= 2 && u.uploadCount <= 3).length,
        "4-5": userFrequency.filter((u: any) => u.uploadCount >= 4 && u.uploadCount <= 5).length,
        "6+": userFrequency.filter((u: any) => u.uploadCount >= 6).length,
      };

      res.json({
        newUsers,
        returningUsers,
        returningRate: totalUsers > 0 ? ((returningUsers / totalUsers) * 100).toFixed(1) : 0,
        frequencyDist
      });
    } catch (error) {
      console.error("Error in /api/returning-users:", error);
      res.status(500).json({ error: "Failed to fetch returning users data" });
    }
  });

  // GET /api/category-summary
  app.get("/api/category-summary", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      const categoryData = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$classification",
            uploads: { $sum: 1 },
            users: { $addToSet: "$sessionId" },
            totalResults: { $sum: { $size: { $ifNull: ["$searchResults", []] } } }
          }
        },
        {
          $project: {
            classification: "$_id",
            uploads: 1,
            userCount: { $size: "$users" },
            avgResultsPerUpload: { $divide: ["$totalResults", "$uploads"] }
          }
        }
      ]).toArray();

      res.json({ categoryData });
    } catch (error) {
      console.error("Error in /api/category-summary:", error);
      res.status(500).json({ error: "Failed to fetch category data" });
    }
  });

  // GET /api/product-performance
  app.get("/api/product-performance", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const products = db.collection(PRODUCTS_COLLECTION);
      const filters = parseFilters(req);

      // Get top SKUs from search results
      const skuData = await features.aggregate([
        { $match: filters },
        { $unwind: { path: "$searchResults", includeArrayIndex: "rank" } },
        {
          $group: {
            _id: "$searchResults",
            impressions: { $sum: 1 },
            avgRank: { $avg: "$rank" },
            classifications: { $addToSet: "$classification" }
          }
        },
        { $sort: { impressions: -1 } },
        { $limit: 50 }
      ]).toArray();

      // Enrich with product details
      const skuIds = skuData.map((s: any) => s._id);
      const productDetails = await products.find({ sku: { $in: skuIds } }).toArray();
      
      const enrichedData = skuData.map((sku: any) => {
        const product = productDetails.find((p: any) => p.sku === sku._id);
        return {
          sku: sku._id,
          productName: product?.productName || sku._id,
          impressions: sku.impressions,
          avgRank: sku.avgRank.toFixed(2),
          classifications: sku.classifications
        };
      });

      res.json({ topProducts: enrichedData });
    } catch (error) {
      console.error("Error in /api/product-performance:", error);
      res.status(500).json({ error: "Failed to fetch product performance data" });
    }
  });

  // GET /api/geography
  app.get("/api/geography", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      const geoData = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$userLocation",
            users: { $addToSet: "$sessionId" },
            uploads: { $sum: 1 },
            clicks: { $sum: { $size: { $ifNull: ["$searchResults", []] } } }
          }
        },
        {
          $project: {
            location: "$_id",
            userCount: { $size: "$users" },
            uploads: 1,
            clicks: 1,
            clickRate: {
              $cond: [
                { $gt: ["$uploads", 0] },
                { $multiply: [{ $divide: ["$clicks", "$uploads"] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { userCount: -1 } },
        { $limit: 20 }
      ]).toArray();

      res.json({ geoData });
    } catch (error) {
      console.error("Error in /api/geography:", error);
      res.status(500).json({ error: "Failed to fetch geography data" });
    }
  });

  // GET /api/device-analytics
  app.get("/api/device-analytics", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      const deviceData = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$deviceType",
            users: { $addToSet: "$sessionId" },
            uploads: { $sum: 1 },
            clicks: { $sum: { $size: { $ifNull: ["$searchResults", []] } } }
          }
        },
        {
          $project: {
            device: "$_id",
            userCount: { $size: "$users" },
            uploads: 1,
            clicks: 1,
            clickRate: {
              $cond: [
                { $gt: ["$uploads", 0] },
                { $multiply: [{ $divide: ["$clicks", "$uploads"] }, 100] },
                0
              ]
            }
          }
        }
      ]).toArray();

      res.json({ deviceData });
    } catch (error) {
      console.error("Error in /api/device-analytics:", error);
      res.status(500).json({ error: "Failed to fetch device analytics data" });
    }
  });

  // GET /api/time-patterns
  app.get("/api/time-patterns", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      // Hourly patterns
      const hourlyData = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            uploads: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

      // Daily patterns
      const dailyData = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            uploads: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

      res.json({
        hourlyData: hourlyData.map((h: any) => ({ hour: h._id, uploads: h.uploads })),
        dailyData: dailyData.map((d: any) => ({ day: d._id, uploads: d.uploads }))
      });
    } catch (error) {
      console.error("Error in /api/time-patterns:", error);
      res.status(500).json({ error: "Failed to fetch time patterns data" });
    }
  });

  // GET /api/shares-downloads
  app.get("/api/shares-downloads", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const filters = parseFilters(req);

      // Note: The schema doesn't show share/download fields, so returning placeholder
      // You may need to add these fields to your schema or adjust this endpoint
      const shareData = await features.aggregate([
        { $match: filters },
        {
          $group: {
            _id: "$deviceType",
            sessions: { $sum: 1 }
          }
        }
      ]).toArray();

      res.json({
        message: "Share/download tracking not yet implemented in schema",
        deviceBreakdown: shareData
      });
    } catch (error) {
      console.error("Error in /api/shares-downloads:", error);
      res.status(500).json({ error: "Failed to fetch shares/downloads data" });
    }
  });

  // GET /api/recent-queries - Top 50 with high engagement (>5 actions)
  app.get("/api/recent-queries", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);

      const recentQueries = await features.aggregate([
        {
          $addFields: {
            actions: { $size: { $ifNull: ["$searchResults", []] } }
          }
        },
        { $match: { actions: { $gt: 5 } } },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        {
          $project: {
            sessionId: 1,
            createdAt: 1,
            userLocation: 1,
            classification: 1,
            deviceType: 1,
            actions: 1,
            userImage: 1,
            segmentation_success: 1
          }
        }
      ]).toArray();

      res.json({ queries: recentQueries });
    } catch (error) {
      console.error("Error in /api/recent-queries:", error);
      res.status(500).json({ error: "Failed to fetch recent queries" });
    }
  });

  return server;
}
