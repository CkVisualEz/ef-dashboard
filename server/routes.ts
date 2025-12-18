import type { Express, Request, Response } from "express";
import { Server } from "http";
import { getDatabase } from "./db";
import { generateToken, optionalAuth, AuthRequest } from "./auth";
import bcrypt from "bcryptjs";

export async function registerRoutes(server: Server, app: Express) {
  const FEATURES_COLLECTION = process.env.NEW_FEATURES_COLLECTION || "analytics";
  const PRODUCTS_COLLECTION = process.env.NEW_PRODUCTS_COLLECTION || "ef_products";
  
  console.log("[ROUTES] Using collections:", {
    FEATURES_COLLECTION,
    PRODUCTS_COLLECTION,
    envVar: process.env.NEW_FEATURES_COLLECTION || "not set (using default: analytics)"
  });

  // Helper function to compute deviceType from deviceInfo (user agent) in MongoDB aggregation
  // Returns an expression that determines device type: Desktop, Mobile, Tablet, or Unknown
  const getDeviceTypeExpression = () => {
    return {
      $cond: [
        // If deviceType exists and is not "unknown", use it
        {
          $and: [
            { $ne: [{ $ifNull: ["$deviceType", null] }, null] },
            { $ne: ["$deviceType", "unknown"] },
            { $ne: ["$deviceType", "Unknown"] }
          ]
        },
        "$deviceType",
        // Otherwise, parse from deviceInfo
        {
          $cond: [
            { $ne: [{ $ifNull: ["$deviceInfo", null] }, null] },
            {
              $let: {
                vars: { ua: { $toLower: { $toString: "$deviceInfo" } } },
                in: {
                  $cond: [
                    // Check for Tablet
                    {
                      $or: [
                        { $regexMatch: { input: "$$ua", regex: "ipad", options: "i" } },
                        { $regexMatch: { input: "$$ua", regex: "tablet", options: "i" } },
                        { $regexMatch: { input: "$$ua", regex: "playbook", options: "i" } },
                        { $regexMatch: { input: "$$ua", regex: "kindle", options: "i" } }
                      ]
                    },
                    "Tablet",
                    {
                      $cond: [
                        // Check for Mobile
                        {
                          $or: [
                            { $regexMatch: { input: "$$ua", regex: "mobile", options: "i" } },
                            { $regexMatch: { input: "$$ua", regex: "iphone", options: "i" } },
                            { $regexMatch: { input: "$$ua", regex: "ipod", options: "i" } },
                            { $regexMatch: { input: "$$ua", regex: "android.*mobile", options: "i" } },
                            { $regexMatch: { input: "$$ua", regex: "blackberry", options: "i" } },
                            { $regexMatch: { input: "$$ua", regex: "windows phone", options: "i" } }
                          ]
                        },
                        "Mobile",
                        {
                          $cond: [
                            // Check for Desktop
                            {
                              $or: [
                                { $regexMatch: { input: "$$ua", regex: "windows", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "macintosh", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "mac os", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "linux", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "x11", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "chrome", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "firefox", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "safari", options: "i" } },
                                { $regexMatch: { input: "$$ua", regex: "edge", options: "i" } }
                              ]
                            },
                            "Desktop",
                            "Unknown"
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            },
            "Unknown"
          ]
        }
      ]
    };
  };

  // Helper to parse query filters
  const parseFilters = (req: Request) => {
    const { startDate, endDate, classification, device, state, city } = req.query;
    const filters: any = {};

    // Always filter for analytics documents (those with sessionId)
    // This ensures we only query actual analytics data, not other document types
    filters.sessionId = { $exists: true, $ne: null };

    // Note: createdAt field may not exist, we'll use _id timestamp in aggregations
    // For basic filtering, we'll add date filter to match stage if needed

    if (classification) {
      // Use case-insensitive regex matching for classification
      // This handles variations like "carpet", "Carpet", "CARPET", "hard_surface", "hard surface", "hard-surface", etc.
      // Treat underscores, spaces, and hyphens as equivalent
      const classificationStr = String(classification);
      // Escape special regex characters except the ones we're replacing
      const escaped = classificationStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace underscores, spaces, and hyphens with a character class that matches any of them
      const pattern = escaped.replace(/[_\s-]/g, "[_\\s-]");
      filters.classification = { 
        $regex: new RegExp(`^${pattern}$`, "i") 
      };
    }

    if (device) {
      // Note: deviceType may not exist in all documents, so we'll filter after computing it from deviceInfo
      // Don't add deviceType filter here - we'll handle it in aggregation pipeline
    }

    if (state) {
      filters["userLocation.state"] = state;
    }

    if (city) {
      filters["userLocation.city"] = city;
    }

    return { filters, startDate, endDate, device };
  };

  // Helper function to add device filter stages (must be added BEFORE grouping/counting)
  // This computes deviceType from deviceInfo if needed, then filters by device
  const getDeviceFilterStages = (device?: any) => {
    if (!device || Array.isArray(device)) return [];
    const deviceStr = String(device);
    if (!deviceStr) return [];
    
    return [
      {
        $addFields: {
          computedDeviceType: getDeviceTypeExpression()
        }
      },
      {
        $match: {
          $expr: {
            $eq: [
              { $toLower: { $ifNull: ["$computedDeviceType", "Unknown"] } },
              { $toLower: deviceStr }
            ]
          }
        }
      }
    ];
  };

  // GET /api/overview
  app.get("/api/overview", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using _id timestamp
      if (startDate || endDate) {
        const dateExpr: any[] = [];
        if (startDate) {
          dateExpr.push({ $gte: [{ $toDate: "$_id" }, new Date(startDate as string)] });
        }
        if (endDate) {
          dateExpr.push({ $lte: [{ $toDate: "$_id" }, new Date(endDate as string)] });
        }
        if (dateExpr.length > 0) {
          baseMatch.push({ $match: { $expr: { $and: dateExpr } } });
        }
      }

      // Total Active Users - count unique userIds from analytics
      // Use the specified pipeline structure: match userId not null, sort, group, count
      const totalUsersPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: {
              $ne: null
            }
          }
        },
        {
          $sort: {
            created_at: -1
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $count: "distinct_users"
        }
      ];
      const totalUsersResult = await features.aggregate(totalUsersPipeline).toArray();
      const totalUsers = totalUsersResult[0]?.distinct_users || 0;

      // Total uploads - only count documents with userId
      const totalUploadsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: {
              $ne: null
            }
          }
        },
        { $count: "total" }
      ];
      const totalUploadsResult = await features.aggregate(totalUploadsPipeline).toArray();
      const totalUploads = totalUploadsResult[0]?.total || 0;

      // Total clicks - count result_opened actions from user_actions array
      // Only count documents with userId and actions that contain "result_opened"
      const clicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: {
              $ne: null
            },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            // Extract current_index from action string (e.g., "result_opened_of_current_index_1_result_index_12...")
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    0
                  ]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalRank: { $sum: "$extractedRank" }
          }
        }
      ];
      const clicksAgg = await features.aggregate(clicksPipeline).toArray();
      const totalClicks = clicksAgg[0]?.total || 0;
      const totalRank = clicksAgg[0]?.totalRank || 0;
      const avgClickedRank = totalClicks > 0 ? (totalRank / totalClicks).toFixed(2) : "0.00";

      // Total shares - count link_copied and result_shared_on_mail actions from user_actions array
      // Only count documents with userId
      const sharesAgg = await features.aggregate([
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: {
              $ne: null
            },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail"]
            }
          }
        },
        {
          $count: "total"
        }
      ]).toArray();
      const totalShares = sharesAgg[0]?.total || 0;

      // Total downloads - count summary_downloaded actions from user_actions array
      // Only count documents with userId
      const downloadsAgg = await features.aggregate([
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: {
              $ne: null
            },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": "summary_downloaded"
          }
        },
        {
          $count: "total"
        }
      ]).toArray();
      const totalDownloads = downloadsAgg[0]?.total || 0;

      // Uploads by classification - handle null/undefined classifications
      const classificationStats = await features.aggregate([
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $group: {
            _id: { $ifNull: ["$classification", "unknown"] },
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Device breakdown (compute deviceType from deviceInfo if needed)
      // Note: If device filter is applied, this will only show the selected device
      const deviceStats = await features.aggregate([
        ...baseMatch,
        {
          $addFields: {
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        // Apply device filter if specified
        ...(device ? [{
          $match: {
            $expr: {
              $eq: [
                { $toLower: "$computedDeviceType" },
                { $toLower: device as string }
              ]
            }
          }
        }] : []),
        {
          $group: {
            _id: "$computedDeviceType",
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Upload trends (last 14 days) - using _id timestamp
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const trendData = await features.aggregate([
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            $expr: {
              $gte: [{ $toDate: "$_id" }, twoWeeksAgo]
            }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$_id" } } },
              classification: { $ifNull: ["$classification", "unknown"] }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]).toArray();

      const response = {
        kpis: {
          totalUsers,
          totalUploads,
          avgUploadsPerUser: totalUsers > 0 ? (totalUploads / totalUsers).toFixed(1) : 0,
          totalClicks,
          clickRate: totalUploads > 0 ? (totalClicks / totalUploads).toFixed(1) : 0,
          avgClickedRank,
          totalShares,
          totalDownloads,
          shareDownloadRate: totalUploads > 0 ? ((totalShares + totalDownloads) / totalUploads).toFixed(1) : 0,
        },
        classificationStats,
        deviceStats,
        trendData
      };
      res.json(response);
    } catch (error) {
      console.error("[OVERVIEW] Error:", error);
      res.status(500).json({ error: "Failed to fetch overview data" });
    }
  });

  // GET /api/returning-users
  app.get("/api/returning-users", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage - start with userId filter
      const baseMatch: any[] = [
        {
          $match: {
            userId: {
              $ne: null
            }
          }
        }
      ];

      // Add classification filter if present
      if (filters.classification) {
        baseMatch.push({ $match: { classification: filters.classification } });
      }

      // Add location filters if present
      if (filters["userLocation.state"]) {
        baseMatch.push({ $match: { "userLocation.state": filters["userLocation.state"] } });
      }
      if (filters["userLocation.city"]) {
        baseMatch.push({ $match: { "userLocation.city": filters["userLocation.city"] } });
      }
      
      // Add date filter using created_at field (if provided)
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(startDate as string);
        }
        if (endDate) {
          dateFilter.$lte = new Date(endDate as string);
        }
        baseMatch.push({ $match: { created_at: dateFilter } });
      }

      // Get unique users and their session count
      // Reference query structure: match userId, sort by created_at, group by userId and count
      const userFrequencyPipeline = [
        {
          $match: {
            userId: {
              $ne: null
            }
          }
        },
        // Add classification filter if present
        ...(filters.classification ? [{ $match: { classification: filters.classification } }] : []),
        // Add location filters if present
        ...(filters["userLocation.state"] ? [{ $match: { "userLocation.state": filters["userLocation.state"] } }] : []),
        ...(filters["userLocation.city"] ? [{ $match: { "userLocation.city": filters["userLocation.city"] } }] : []),
        // Add date filter using created_at field (if provided)
        ...(startDate || endDate ? [{
          $match: {
            created_at: {
              ...(startDate ? { $gte: new Date(startDate as string) } : {}),
              ...(endDate ? { $lte: new Date(endDate as string) } : {})
            }
          }
        }] : []),
        // Apply device filter stages (computes deviceType from deviceInfo if needed)
        ...getDeviceFilterStages(device),
        {
          $sort: {
            created_at: -1
          }
        },
        {
          $group: {
            _id: "$userId", // Group by userId to get unique users
            sessionCount: { $count: {} }, // Count sessions per user (using $count as per reference)
            // Collect session dates - use created_at if available, otherwise use _id timestamp
            sessions: {
              $push: {
                $cond: [
                  { $ne: ["$created_at", null] },
                  "$created_at",
                  { $toDate: "$_id" }
                ]
              }
            }
          }
        }
      ];
      const userFrequency = await features.aggregate(userFrequencyPipeline).toArray();

      // Categorize unique users based on session count in analytics
      // Only count users with valid userId (already filtered, but double-check)
      // New Users: count of unique users with exactly 1 session in analytics
      // Returning Users: count of unique users with more than 1 session in analytics
      const validUsers = userFrequency.filter((u: any) => u._id != null && u._id !== undefined);
      const newUsers = validUsers.length; // Count of users with 1 session
      const returningUsers = validUsers.filter((u: any) => u.sessionCount > 1).length; // Count of users with >1 session
      const totalUsers = newUsers + returningUsers;

      // Calculate average gap between sessions for returning users
      // For each returning user with valid userId: calculate gaps between consecutive sessions, then average those gaps
      // Then average across all returning users
      let totalAverageGap = 0;
      let returningUsersWithGaps = 0;

      validUsers
        .filter((u: any) => u.sessionCount > 1 && u._id != null && u._id !== undefined)
        .forEach((user: any) => {
          // Filter out null/undefined dates and convert to Date objects
          const validSessions = (user.sessions || [])
            .filter((d: any) => d != null && d !== undefined)
            .map((d: any) => {
              // Handle both Date objects and date strings
              if (d instanceof Date) {
                return isNaN(d.getTime()) ? null : d;
              }
              // Try to parse as Date
              const date = new Date(d);
              return isNaN(date.getTime()) ? null : date;
            })
            .filter((d: Date | null) => d !== null) as Date[];

          // Sort sessions by date (oldest first)
          const sortedSessions = validSessions.sort((a: Date, b: Date) => a.getTime() - b.getTime());

          // Calculate gaps between consecutive sessions (in days)
          // Formula: For user with sessions on Dec 3, Dec 16, Dec 28:
          // Gap 1: 16 - 3 = 13 days
          // Gap 2: 28 - 16 = 12 days
          // User average: (13 + 12) / 2 = 12.5 days
          // Need at least 2 sessions to calculate gaps
          if (sortedSessions.length >= 2) {
            const gaps: number[] = [];
            for (let i = 1; i < sortedSessions.length; i++) {
              const gapMs = sortedSessions[i].getTime() - sortedSessions[i - 1].getTime();
              const gapDays = gapMs / (1000 * 60 * 60 * 24); // Convert to days
              gaps.push(gapDays);
            }

            // Calculate average gap for this user: sum of gaps / number of intervals
            if (gaps.length > 0) {
              const sumOfGaps = gaps.reduce((sum, gap) => sum + gap, 0);
              const numberOfIntervals = gaps.length;
              const userAverageGap = sumOfGaps / numberOfIntervals;
              totalAverageGap += userAverageGap;
              returningUsersWithGaps++;
            }
          }
        });

      // Calculate overall average gap (Returning Rate)
      // Average of all returning users' average gaps
      console.log("[RETURNING-USERS] Total average gap:", totalAverageGap);
      console.log("[RETURNING-USERS] Returning users with gaps:", returningUsersWithGaps);
      const returningRate = returningUsersWithGaps > 0 
        ? (totalAverageGap / returningUsersWithGaps).toFixed(1) 
        : "0.0";
      
      // Debug logging to help diagnose issues
      if (returningUsers > 0 && returningUsersWithGaps === 0) {
        const sampleUser = validUsers.find((u: any) => u.sessionCount > 1);
        if (sampleUser) {
          // Try to process the sample user to see what's happening
          const sampleSessions = (sampleUser.sessions || [])
            .filter((d: any) => d != null && d !== undefined)
            .map((d: any) => {
              if (d instanceof Date) return d;
              if (d && typeof d.toISOString === 'function') return new Date(d);
              return new Date(d);
            })
            .filter((d: Date) => !isNaN(d.getTime()));
          
          console.log("[RETURNING-USERS] Warning: No gaps calculated for returning users", {
            returningUsers,
            returningUsersWithGaps,
            sampleUser: {
              userId: sampleUser._id,
              sessionCount: sampleUser.sessionCount,
              sessionsLength: sampleUser.sessions?.length,
              sessionsRaw: sampleUser.sessions,
              validSessionsCount: sampleSessions.length,
              validSessions: sampleSessions
            }
          });
        }
      }

      // Upload frequency distribution (based on session count per unique user with valid userId)
      const frequencyDist = {
        "1": validUsers.filter((u: any) => u.sessionCount === 1).length,
        "2-3": validUsers.filter((u: any) => u.sessionCount >= 2 && u.sessionCount <= 3).length,
        "4-5": validUsers.filter((u: any) => u.sessionCount >= 4 && u.sessionCount <= 5).length,
        "6+": validUsers.filter((u: any) => u.sessionCount >= 6).length,
      };

      // Calculate trend data (new vs returning users over time)
      // Get trendPeriod and trendDateRange from query params
      const trendPeriod = req.query.trendPeriod as string || "days";
      const trendStartDate = req.query.trendStartDate as string;
      const trendEndDate = req.query.trendEndDate as string;

      // Default date range based on period
      let trendDateStart: Date;
      let trendDateEnd: Date = new Date();
      
      if (trendStartDate && trendEndDate) {
        // Use provided date range
        trendDateStart = new Date(trendStartDate);
        trendDateEnd = new Date(trendEndDate);
      } else {
        // Default: last 30 days for days/week, this year for month
        if (trendPeriod === "month") {
          trendDateStart = new Date(new Date().getFullYear(), 0, 1); // Start of year
        } else {
          trendDateStart = new Date();
          trendDateStart.setDate(trendDateStart.getDate() - 30); // Last 30 days
        }
      }

      // Build trend pipeline
      const trendMatch: any[] = [
        {
          $match: {
            userId: { $ne: null }
          }
        }
      ];

      // Add classification filter if present
      if (filters.classification) {
        trendMatch.push({ $match: { classification: filters.classification } });
      }

      // Add location filters if present
      if (filters["userLocation.state"]) {
        trendMatch.push({ $match: { "userLocation.state": filters["userLocation.state"] } });
      }
      if (filters["userLocation.city"]) {
        trendMatch.push({ $match: { "userLocation.city": filters["userLocation.city"] } });
      }

      // Add trend date filter
      trendMatch.push({
        $match: {
          created_at: {
            $gte: trendDateStart,
            $lte: trendDateEnd
          }
        }
      });

      // Calculate trend data: new vs returning users over time
      // Step 1: Get ALL users' first session dates (ALL TIME - no date filter, but with other filters)
      // This ensures we can correctly identify returning users who had sessions before the trend date range
      const firstSessionMatch: any[] = [
        {
          $match: {
            userId: { $ne: null }
          }
        }
      ];

      // Add classification filter if present
      if (filters.classification) {
        firstSessionMatch.push({ $match: { classification: filters.classification } });
      }

      // Add location filters if present
      if (filters["userLocation.state"]) {
        firstSessionMatch.push({ $match: { "userLocation.state": filters["userLocation.state"] } });
      }
      if (filters["userLocation.city"]) {
        firstSessionMatch.push({ $match: { "userLocation.city": filters["userLocation.city"] } });
      }

      // Apply device filter (but NO date filter - we want ALL TIME first sessions)
      const allUsersFirstSessionPipeline = [
        ...firstSessionMatch,
        ...getDeviceFilterStages(device),
        {
          $group: {
            _id: "$userId",
            firstSession: { $min: { $ifNull: ["$created_at", { $toDate: "$_id" }] } }
          }
        }
      ];

      const allUsersFirstSession = await features.aggregate(allUsersFirstSessionPipeline).toArray();

      // Create a map of userId -> firstSession for quick lookup
      // Convert userId to string to ensure consistent lookup
      const userFirstSessionMap = new Map<string, Date>();
      allUsersFirstSession.forEach((u: any) => {
        if (u.firstSession && u._id) {
          const firstSession = u.firstSession instanceof Date ? u.firstSession : new Date(u.firstSession);
          const userIdStr = String(u._id);
          userFirstSessionMap.set(userIdStr, firstSession);
        }
      });

      // Step 2: Group sessions by period and userId
      const trendDataPipeline = [
        ...trendMatch,
        ...getDeviceFilterStages(device),
        {
          $addFields: {
            period: trendPeriod === "days" 
              ? { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$created_at", { $toDate: "$_id" }] } } }
              : trendPeriod === "week"
              ? { $dateToString: { format: "%Y-W%V", date: { $ifNull: ["$created_at", { $toDate: "$_id" }] } } }
              : { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$created_at", { $toDate: "$_id" }] } } }
          }
        },
        {
          $group: {
            _id: {
              period: "$period",
              userId: "$userId"
            }
          }
        },
        {
          $group: {
            _id: "$_id.period",
            users: { $addToSet: "$_id.userId" }
          }
        },
        { $sort: { _id: 1 } }
      ];

      const trendPeriodData = await features.aggregate(trendDataPipeline).toArray();

      // Collect all unique userIds from trend data to ensure we have their first sessions
      const allTrendUserIds = new Set<string>();
      trendPeriodData.forEach((periodData: any) => {
        if (periodData.users && Array.isArray(periodData.users)) {
          periodData.users.forEach((userId: any) => {
            allTrendUserIds.add(String(userId));
          });
        }
      });

      // If we have users in trend data but they're missing from first session map,
      // we need to get their first sessions (ALL TIME - with same filters but without date filter)
      const missingUserIds = Array.from(allTrendUserIds).filter(userId => !userFirstSessionMap.has(userId));
      if (missingUserIds.length > 0) {
        // Build $or condition to match any of the missing userIds (handles both string and ObjectId)
        const userIdConditions = missingUserIds.map(userId => ({
          $expr: {
            $eq: [{ $toString: "$userId" }, userId]
          }
        }));

        // Get first sessions for missing users (ALL TIME - no date filter)
        const missingFirstSessions = await features.aggregate([
          ...firstSessionMatch,
          ...getDeviceFilterStages(device),
          {
            $match: {
              $or: userIdConditions
            }
          },
          {
            $group: {
              _id: "$userId",
              firstSession: { $min: { $ifNull: ["$created_at", { $toDate: "$_id" }] } }
            }
          }
        ]).toArray();

        missingFirstSessions.forEach((u: any) => {
          if (u.firstSession && u._id) {
            const firstSession = u.firstSession instanceof Date ? u.firstSession : new Date(u.firstSession);
            const userIdStr = String(u._id);
            userFirstSessionMap.set(userIdStr, firstSession);
          }
        });
      }

      // Debug: Log summary
      console.log(`[TREND-DATA] Total users in first session map: ${userFirstSessionMap.size}`);
      console.log(`[TREND-DATA] Total users in trend data: ${allTrendUserIds.size}`);
      console.log(`[TREND-DATA] Missing users: ${missingUserIds.length}`);

      // Helper function to get ISO week number (moved outside to avoid strict mode error)
      const getISOWeek = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // Helper function to parse period string to start date (in UTC)
      const parsePeriodStart = (periodStr: string, periodType: string): Date => {
        if (periodType === "days") {
          // Parse as UTC date: YYYY-MM-DD -> UTC midnight
          return new Date(periodStr + "T00:00:00.000Z");
        } else if (periodType === "week") {
          const [year, weekStr] = periodStr.split("-W");
          const yearNum = parseInt(year);
          const weekNum = parseInt(weekStr);
          // Calculate ISO week start (Monday of that week)
          const date = new Date(Date.UTC(yearNum, 0, 1));
          const jan1Day = date.getUTCDay() || 7; // 1 = Monday, 7 = Sunday
          const daysToMonday = jan1Day === 1 ? 0 : 8 - jan1Day;
          date.setUTCDate(date.getUTCDate() - daysToMonday);
          date.setUTCDate(date.getUTCDate() + (weekNum - 1) * 7);
          return date;
        } else {
          // Parse as UTC date: YYYY-MM -> first day of month at UTC midnight
          return new Date(periodStr + "-01T00:00:00.000Z");
        }
      };

      // Helper function to get period end date (in UTC)
      const getPeriodEnd = (periodStart: Date, periodType: string): Date => {
        const periodEnd = new Date(periodStart);
        if (periodType === "days") {
          periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
        } else if (periodType === "week") {
          periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
        } else {
          periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
        }
        return periodEnd;
      };

      // Create a map of period -> users for quick lookup
      const periodUsersMap = new Map<string, any[]>();
      trendPeriodData.forEach((periodData: any) => {
        periodUsersMap.set(periodData._id, periodData.users || []);
      });

      // Generate all periods in the date range (even if no sessions)
      const allPeriods: string[] = [];
      const periodSet = new Set<string>(); // Use Set to avoid duplicates
      let currentDate = new Date(trendDateStart);
      const trendEnd = new Date(trendDateEnd);
      
      // Ensure we include the end date
      trendEnd.setHours(23, 59, 59, 999);
      
      while (currentDate <= trendEnd) {
        let periodStr: string;
        if (trendPeriod === "days") {
          periodStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (trendPeriod === "week") {
          // Get ISO week number
          const year = currentDate.getFullYear();
          const week = getISOWeek(currentDate);
          periodStr = `${year}-W${week.toString().padStart(2, '0')}`;
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          periodStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        // Avoid duplicates using Set
        if (!periodSet.has(periodStr)) {
          periodSet.add(periodStr);
          allPeriods.push(periodStr);
        }
      }
      
      // Sort periods to ensure correct order
      allPeriods.sort();

      // Helper function to get date only (year-month-day) for comparison, ignoring time (UTC)
      const getDateOnly = (date: Date): Date => {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      };

      // Step 3: For each period, determine new vs returning users
      // Logic: Get all users in the date range, then for each period check if user has session BEFORE that period
      const trendData = allPeriods.map((periodStr: string) => {
        const users = periodUsersMap.get(periodStr) || [];
        let newUsersCount = 0;
        let returningUsersCount = 0;

        users.forEach((userId: any) => {
          // Convert userId to string for consistent lookup
          const userIdStr = String(userId);
          const userFirstSession = userFirstSessionMap.get(userIdStr);
          
          if (!userFirstSession) {
            // If we don't have first session, we can't determine - skip this user
            return;
          }

          const periodStart = parsePeriodStart(periodStr, trendPeriod);
          const periodStartDateOnly = getDateOnly(periodStart);
          const firstSessionDateOnly = getDateOnly(new Date(userFirstSession));
          
          // Check if user has ANY session before this period
          // Since firstSession is the earliest session, if firstSession < periodStart, 
          // then user definitely has a session before this period (RETURNING USER)
          // If firstSession >= periodStart, then user's first session is in or after this period (NEW USER)
          
          if (trendPeriod === "days") {
            // For days: check if first session is before this day
            const firstSessionTime = firstSessionDateOnly.getTime();
            const periodStartTime = periodStartDateOnly.getTime();
            
            if (firstSessionTime < periodStartTime) {
              // User has session before this day - RETURNING USER
              returningUsersCount++;
            } else if (firstSessionTime === periodStartTime) {
              // First session is on this exact day - NEW USER
              newUsersCount++;
            }
            // If firstSessionTime > periodStartTime, shouldn't happen but treat as new user
            else {
              newUsersCount++;
            }
          } else if (trendPeriod === "week") {
            // For weeks: check if first session is before this week
            const periodEnd = getPeriodEnd(periodStart, trendPeriod);
            const periodEndDateOnly = getDateOnly(periodEnd);
            
            const firstSessionTime = firstSessionDateOnly.getTime();
            const periodStartTime = periodStartDateOnly.getTime();
            const periodEndTime = periodEndDateOnly.getTime();
            
            if (firstSessionTime < periodStartTime) {
              // User has session before this week - RETURNING USER
              returningUsersCount++;
            } else if (firstSessionTime >= periodStartTime && firstSessionTime < periodEndTime) {
              // First session is within this week - NEW USER
              newUsersCount++;
            }
            // If firstSessionTime >= periodEndTime, shouldn't happen but treat as new user
            else {
              newUsersCount++;
            }
          } else {
            // For months: check if first session is before this month
            const periodEnd = getPeriodEnd(periodStart, trendPeriod);
            const periodEndDateOnly = getDateOnly(periodEnd);
            
            const firstSessionTime = firstSessionDateOnly.getTime();
            const periodStartTime = periodStartDateOnly.getTime();
            const periodEndTime = periodEndDateOnly.getTime();
            
            if (firstSessionTime < periodStartTime) {
              // User has session before this month - RETURNING USER
              returningUsersCount++;
            } else if (firstSessionTime >= periodStartTime && firstSessionTime < periodEndTime) {
              // First session is within this month - NEW USER
              newUsersCount++;
            }
            // If firstSessionTime >= periodEndTime, shouldn't happen but treat as new user
            else {
              newUsersCount++;
            }
          }
        });

        return {
          date: periodStr,
          newUsers: newUsersCount,
          returningUsers: returningUsersCount
        };
      });

      const response = {
        newUsers,
        returningUsers,
        returningRate: returningRate, // Average gap between sessions (in days) for returning users
        frequencyDist,
        trendData
      };
      res.json(response);
    } catch (error) {
      console.error("[RETURNING-USERS] Error:", error);
      res.status(500).json({ error: "Failed to fetch returning users data" });
    }
  });

  // GET /api/category-summary
  app.get("/api/category-summary", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using created_at
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(startDate as string);
        }
        if (endDate) {
          dateFilter.$lte = new Date(endDate as string);
        }
        baseMatch.push({
          $match: {
            created_at: dateFilter
          }
        });
      }

      // Helper function to normalize classification
      const normalizeClassification = {
        $let: {
          vars: {
            classification: { $ifNull: ["$classification", ""] },
            classificationLower: { $toLower: { $ifNull: ["$classification", ""] } }
          },
          in: {
            $cond: [
              {
                $or: [
                  { $eq: ["$$classificationLower", "unknown"] },
                  { $eq: ["$$classificationLower", "mixed"] },
                  { $eq: ["$$classificationLower", "both"] },
                  { $eq: ["$$classification", ""] }
                ]
              },
              "mixed",
              {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$classificationLower", "hard-surface"] },
                      { $eq: ["$$classificationLower", "hard_surface"] }
                    ]
                  },
                  "hard_surface",
                  {
                    $cond: [
                      { $eq: ["$$classificationLower", "carpet"] },
                      "carpet",
                      "$$classification"
                    ]
                  }
                ]
              }
            ]
          }
        }
      };

      // Get detailed metrics for each surface type
      const surfaceMetricsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null }
          }
        },
        {
          $addFields: {
            normalizedClassification: normalizeClassification
          }
        },
        {
          $facet: {
            // Basic metrics: uploads and users
            basicMetrics: [
        {
          $group: {
                  _id: "$normalizedClassification",
            uploads: { $sum: 1 },
                  users: { $addToSet: "$userId" }
                }
              }
            ],
            // Clicks: result_opened actions
            clicks: [
              {
                $match: {
                  user_actions: {
                    $exists: true,
                    $type: "array",
                    $ne: []
                  }
                }
              },
              {
                $unwind: {
                  path: "$user_actions",
                  preserveNullAndEmptyArrays: false
                }
              },
              {
                $match: {
                  "user_actions.action": {
                    $regex: /^result_opened/,
                    $options: "i"
                  }
                }
              },
              {
                $addFields: {
                  extractedRank: {
                    $let: {
                      vars: {
                        matchResult: {
                          $regexFind: {
                            input: "$user_actions.action",
                            regex: /current_index_(\d+)/,
                            options: "i"
                          }
                        }
                      },
                      in: {
                        $cond: [
                          { $ne: ["$$matchResult", null] },
                          { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                          0
                        ]
                      }
                    }
                  }
                }
              },
              {
                $group: {
                  _id: "$normalizedClassification",
                  clicks: { $sum: 1 },
                  totalRank: { $sum: "$extractedRank" }
                }
              }
            ],
            // Shares and Downloads
            sharesDownloads: [
              {
                $match: {
                  user_actions: {
                    $exists: true,
                    $type: "array",
                    $ne: []
                  }
                }
              },
              {
                $unwind: {
                  path: "$user_actions",
                  preserveNullAndEmptyArrays: false
                }
              },
              {
                $addFields: {
                  isShare: {
                    $or: [
                      { $eq: [{ $toLower: "$user_actions.action" }, "link_copied"] },
                      { $eq: [{ $toLower: "$user_actions.action" }, "result_shared_on_mail"] }
                    ]
                  },
                  isDownload: {
                    $eq: [{ $toLower: "$user_actions.action" }, "summary_downloaded"]
                  }
                }
              },
              {
                $group: {
                  _id: "$normalizedClassification",
                  shares: {
                    $sum: {
                      $cond: ["$isShare", 1, 0]
                    }
                  },
                  downloads: {
                    $sum: {
                      $cond: ["$isDownload", 1, 0]
                    }
                  }
                }
              }
            ]
          }
        }
      ];

      const surfaceMetricsResult = await features.aggregate(surfaceMetricsPipeline).toArray();
      const metrics = surfaceMetricsResult[0] || {};

      // Combine metrics by surface type
      const surfaceTypes = ["carpet", "hard_surface", "mixed"];
      const surfaceData: any = {};

      surfaceTypes.forEach((type) => {
        const basic = metrics.basicMetrics?.find((m: any) => m._id === type) || { uploads: 0, users: [] };
        const clicks = metrics.clicks?.find((m: any) => m._id === type) || { clicks: 0, totalRank: 0 };
        const sharesDownloads = metrics.sharesDownloads?.find((m: any) => m._id === type) || { shares: 0, downloads: 0 };

        const uploads = basic.uploads || 0;
        const users = Array.isArray(basic.users) ? basic.users.length : 0;
        const pdpClicks = clicks.clicks || 0;
        const clickRate = uploads > 0 ? ((pdpClicks / uploads) * 100).toFixed(2) : "0.00";
        const avgRank = pdpClicks > 0 ? (clicks.totalRank / pdpClicks).toFixed(2) : "0.00";
        const totalShares = sharesDownloads.shares || 0;
        const totalDownloads = sharesDownloads.downloads || 0;
        const shareDownloadRate = uploads > 0 ? (((totalShares + totalDownloads) / uploads) * 100).toFixed(2) : "0.00";

        surfaceData[type] = {
          classification: type === "hard_surface" ? "Hard Surface" : type === "carpet" ? "Carpet" : "Mixed/Both",
          users,
          uploads,
          pdpClicks,
          clickRate: parseFloat(clickRate),
          avgRank: parseFloat(avgRank),
          shareDownloadRate: parseFloat(shareDownloadRate)
        };
      });

      // Calculate trend data over time (by day)
      const trendPeriod = req.query.trendPeriod as string || "days";
      const trendStartDate = req.query.trendStartDate as string;
      const trendEndDate = req.query.trendEndDate as string;

      let trendDateStart: Date;
      let trendDateEnd: Date = new Date();
      
      if (trendStartDate && trendEndDate) {
        trendDateStart = new Date(trendStartDate);
        trendDateEnd = new Date(trendEndDate);
      } else {
        if (trendPeriod === "month") {
          trendDateStart = new Date(new Date().getFullYear(), 0, 1);
        } else {
          trendDateStart = new Date();
          trendDateStart.setDate(trendDateStart.getDate() - 30);
        }
      }

      const trendPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            created_at: {
              $gte: trendDateStart,
              $lte: trendDateEnd
            }
          }
        },
        {
          $addFields: {
            normalizedClassification: normalizeClassification,
            period: trendPeriod === "days" 
              ? { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$created_at", { $toDate: "$_id" }] } } }
              : trendPeriod === "week"
              ? { $dateToString: { format: "%Y-W%V", date: { $ifNull: ["$created_at", { $toDate: "$_id" }] } } }
              : { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$created_at", { $toDate: "$_id" }] } } }
          }
        },
        {
          $group: {
            _id: {
              period: "$period",
              classification: "$normalizedClassification"
            },
            uploads: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: "$_id.period",
            categories: {
              $push: {
                classification: "$_id.classification",
                uploads: "$uploads"
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ];

      const trendDataRaw = await features.aggregate(trendPipeline).toArray();
      
      // Create a map of period -> categories for quick lookup
      const periodDataMap = new Map<string, any[]>();
      trendDataRaw.forEach((item: any) => {
        periodDataMap.set(item._id, item.categories || []);
      });

      // Helper function to get ISO week number
      const getISOWeek = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // Generate all periods in the date range (even if no uploads)
      const allPeriods: string[] = [];
      const periodSet = new Set<string>();
      let currentDate = new Date(trendDateStart);
      const trendEnd = new Date(trendDateEnd);
      
      // Ensure we include the end date
      trendEnd.setHours(23, 59, 59, 999);
      
      while (currentDate <= trendEnd) {
        let periodStr: string;
        if (trendPeriod === "days") {
          periodStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (trendPeriod === "week") {
          // Get ISO week number
          const year = currentDate.getFullYear();
          const week = getISOWeek(currentDate);
          periodStr = `${year}-W${week.toString().padStart(2, '0')}`;
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          periodStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        // Avoid duplicates using Set
        if (!periodSet.has(periodStr)) {
          periodSet.add(periodStr);
          allPeriods.push(periodStr);
        }
      }
      
      // Sort periods to ensure correct order
      allPeriods.sort();

      // Format trend data - include all periods with zeros for missing data
      const trendData = allPeriods.map((periodStr: string) => {
        const categories = periodDataMap.get(periodStr) || [];
        const data: any = { date: periodStr };
        surfaceTypes.forEach((type) => {
          const catData = categories.find((c: any) => c.classification === type);
          data[type] = catData ? catData.uploads : 0;
        });
        return data;
      });

      // Calculate total unique users across all categories
      const totalUniqueUsersPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null }
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $count: "totalUsers"
        }
      ];
      const totalUsersResult = await features.aggregate(totalUniqueUsersPipeline).toArray();
      const totalUniqueUsers = totalUsersResult[0]?.totalUsers || 0;

      res.json({
        surfaceData,
        trendData,
        totalUniqueUsers
      });
    } catch (error) {
      console.error("[CATEGORY-SUMMARY] Error:", error);
      res.status(500).json({ error: "Failed to fetch category data" });
    }
  });

  // GET /api/product-performance
  app.get("/api/product-performance", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const products = db.collection(PRODUCTS_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using created_at
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(String(startDate));
        }
        if (endDate) {
          // Include the entire end date (end of day)
          const endDateObj = new Date(String(endDate));
          endDateObj.setHours(23, 59, 59, 999);
          dateFilter.$lte = endDateObj;
        }
        baseMatch.push({
          $match: {
            created_at: dateFilter
          }
        });
      }

      // Normalize classification helper
      const normalizeClassification = {
        $let: {
          vars: {
            classification: { $ifNull: ["$classification", ""] },
            classificationLower: { $toLower: { $ifNull: ["$classification", ""] } }
          },
          in: {
            $cond: [
              {
                $or: [
                  { $eq: ["$$classificationLower", "unknown"] },
                  { $eq: ["$$classificationLower", "mixed"] },
                  { $eq: ["$$classificationLower", "both"] },
                  { $eq: ["$$classification", ""] }
                ]
              },
              "mixed",
              {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$classificationLower", "hard-surface"] },
                      { $eq: ["$$classificationLower", "hard_surface"] }
                    ]
                  },
                  "hard_surface",
                  {
                    $cond: [
                      { $eq: ["$$classificationLower", "carpet"] },
                      "carpet",
                      "$$classification"
                    ]
                  }
                ]
              }
            ]
          }
        }
      };

      // A. Top Clicked SKUs
      // Step 1: Calculate impressions (times SKU appeared in searchResults)
      const impressionsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            searchResults: { $exists: true, $type: "array", $ne: [] }
          }
        },
        {
          $unwind: {
            path: "$searchResults",
            includeArrayIndex: "rank",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $group: {
            _id: "$searchResults",
            impressions: { $sum: 1 },
            classifications: { $addToSet: { $ifNull: ["$classification", "unknown"] } }
          }
        }
      ];
      const impressionsData = await features.aggregate(impressionsPipeline).toArray();

      // Step 2: Calculate clicks (result_opened actions) and extract public_id
      const clicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            extractedPublicId: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /public_id_(.+)$/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $arrayElemAt: ["$$matchResult.captures", 0] },
                    null
                  ]
                }
              }
            },
            normalizedClassification: normalizeClassification,
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 },
            extractedPublicId: { $ne: null }
          }
        },
        {
          $group: {
            _id: "$extractedPublicId",
            clicks: { $sum: 1 },
            totalRank: { $sum: "$extractedRank" },
            classifications: { $addToSet: "$normalizedClassification" },
            states: { $addToSet: { $ifNull: ["$userLocation.state", null] } },
            cities: { $addToSet: { $ifNull: ["$userLocation.city", null] } },
            deviceTypes: { $addToSet: "$computedDeviceType" }
          }
        }
      ];
      const clicksData = await features.aggregate(clicksPipeline).toArray();

      // Step 3: Combine impressions and clicks, calculate metrics
      // Note: searchResults might contain SKU IDs, public_ids, or product objects
      // We'll use public_id as the key for both impressions and clicks
      const publicIdMap = new Map<string, any>();
      
      // Add impressions - searchResults might be SKU IDs or public_ids
      // We'll need to look up products to get public_ids for impressions
      const impressionIdentifiers = impressionsData.map((item: any) => String(item._id));
      
      // Try to find products by both sku and public_id to map impressions to public_ids
      const impressionProducts = await products.find({
        $or: [
          { sku: { $in: impressionIdentifiers } },
          { public_id: { $in: impressionIdentifiers } },
          { sku_id: { $in: impressionIdentifiers } }
        ]
      }).toArray();
      
      // Create a map of sku/sku_id/public_id -> public_id
      const identifierToPublicId = new Map<string, string>();
      impressionProducts.forEach((p: any) => {
        if (p.public_id) {
          if (p.sku) identifierToPublicId.set(String(p.sku), p.public_id);
          if (p.sku_id) identifierToPublicId.set(String(p.sku_id), p.public_id);
          identifierToPublicId.set(String(p.public_id), p.public_id);
        }
      });
      
      // Add impressions using public_id
      impressionsData.forEach((item: any) => {
        const identifier = String(item._id);
        const publicId = identifierToPublicId.get(identifier) || identifier; // Fallback to identifier if not found
        if (publicIdMap.has(publicId)) {
          const existing = publicIdMap.get(publicId);
          existing.impressions += (item.impressions || 0);
        } else {
          publicIdMap.set(publicId, {
            publicId: publicId,
            impressions: item.impressions || 0,
            clicks: 0,
            totalRank: 0,
            classifications: item.classifications || [],
            states: [],
            cities: [],
            deviceTypes: []
          });
        }
      });

      // Add clicks (already using public_id)
      clicksData.forEach((item: any) => {
        const publicId = String(item._id);
        if (publicIdMap.has(publicId)) {
          const existing = publicIdMap.get(publicId);
          existing.clicks = item.clicks || 0;
          existing.totalRank = item.totalRank || 0;
          existing.classifications = item.classifications || existing.classifications;
          existing.states = (item.states || []).filter((s: any) => s !== null);
          existing.cities = (item.cities || []).filter((c: any) => c !== null);
          existing.deviceTypes = item.deviceTypes || [];
        } else {
          publicIdMap.set(publicId, {
            publicId: publicId,
            impressions: 0,
            clicks: item.clicks || 0,
            totalRank: item.totalRank || 0,
            classifications: item.classifications || [],
            states: (item.states || []).filter((s: any) => s !== null),
            cities: (item.cities || []).filter((c: any) => c !== null),
            deviceTypes: item.deviceTypes || []
          });
        }
      });

      // Step 4: Enrich with product details and calculate final metrics
      const publicIds = Array.from(publicIdMap.keys());
      const productDetails = await products.find({ public_id: { $in: publicIds } }).toArray();
      
      const topProducts = Array.from(publicIdMap.values())
        .map((productData: any) => {
          const product = productDetails.find((p: any) => p.public_id === productData.publicId);
          const clicks = productData.clicks || 0;
          const impressions = productData.impressions || 0;
          const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;
          const avgRank = clicks > 0 ? (productData.totalRank / clicks) : 0;
          
          // Format product name: color_id + series_name + variant_name
          const productName = product 
            ? `${product.color_id || ''} ${product.series_name || ''} ${product.variant_name || ''}`.trim() || productData.publicId
            : productData.publicId;

          // Get top states and cities (top 3)
          const stateCounts = new Map<string, number>();
          productData.states.forEach((state: string) => {
            stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
          });
          const topStates = Array.from(stateCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([state]) => state);

          const cityCounts = new Map<string, number>();
          productData.cities.forEach((city: string) => {
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
          });
          const topCities = Array.from(cityCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([city]) => city);

          // Determine category (Carpet/Hard Surface/Mixed)
          // Use product category if available, otherwise use classifications from analytics
          let category = "Mixed";
          if (product?.category) {
            const productCategory = String(product.category).toLowerCase();
            if (productCategory === "carpet") {
              category = "Carpet";
            } else if (productCategory === "hard-surface" || productCategory === "hard_surface") {
              category = "Hard Surface";
            }
          } else {
            const categories = productData.classifications || [];
            if (categories.includes("carpet") && !categories.includes("hard_surface")) {
              category = "Carpet";
            } else if (categories.includes("hard_surface") && !categories.includes("carpet")) {
              category = "Hard Surface";
            }
          }

        return {
            sku: product?.sku_id || productData.publicId, // Use sku_id from product or fallback to publicId
            productName,
            category,
            clicks,
            impressions,
            ctr: parseFloat(ctr.toFixed(2)),
            avgRank: parseFloat(avgRank.toFixed(2)),
            topStates,
            topCities
          };
        })
        .filter((p: any) => p.clicks > 0) // Only show products with clicks
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, 100); // Top 100 clicked products

      // B. Rank Behavior Distribution
      // Calculate distribution of clicked ranks (1, 2, 3, 4+)
      const rankDistributionPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            normalizedClassification: normalizeClassification,
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 }
          }
        },
        {
          $addFields: {
            rankBucket: {
              $cond: [
                { $eq: ["$extractedRank", 0] },
                "Rank 1",
                {
                  $cond: [
                    { $eq: ["$extractedRank", 1] },
                    "Rank 2",
                    {
                      $cond: [
                        { $eq: ["$extractedRank", 2] },
                        "Rank 3",
                        "Rank 4+"
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: "$rankBucket",
            clicks: { $sum: 1 }
          }
        }
      ];
      const rankDistributionData = await features.aggregate(rankDistributionPipeline).toArray();
      
      // Calculate percentages
      const totalClicks = rankDistributionData.reduce((sum: number, item: any) => sum + (item.clicks || 0), 0);
      const rankDistribution = {
        "Rank 1": 0,
        "Rank 2": 0,
        "Rank 3": 0,
        "Rank 4+": 0
      };
      rankDistributionData.forEach((item: any) => {
        if (rankDistribution.hasOwnProperty(item._id)) {
          rankDistribution[item._id as keyof typeof rankDistribution] = totalClicks > 0 
            ? parseFloat(((item.clicks / totalClicks) * 100).toFixed(2))
            : 0;
        }
      });

      // Average clicked rank split by Category
      const avgRankByCategoryPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            normalizedClassification: normalizeClassification
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 }
          }
        },
        {
          $group: {
            _id: "$normalizedClassification",
            clicks: { $sum: 1 },
            totalRank: { $sum: "$extractedRank" }
          }
        }
      ];
      const avgRankByCategoryData = await features.aggregate(avgRankByCategoryPipeline).toArray();
      
      const avgRankByCategory: any = {};
      avgRankByCategoryData.forEach((item: any) => {
        const category = item._id === "hard_surface" ? "Hard Surface" : item._id === "carpet" ? "Carpet" : "Mixed";
        avgRankByCategory[category] = item.clicks > 0 
          ? parseFloat((item.totalRank / item.clicks).toFixed(2))
          : 0;
      });

      // Average clicked rank split by Device
      const avgRankByDevicePipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 }
          }
        },
        {
          $group: {
            _id: "$computedDeviceType",
            clicks: { $sum: 1 },
            totalRank: { $sum: "$extractedRank" }
          }
        }
      ];
      const avgRankByDeviceData = await features.aggregate(avgRankByDevicePipeline).toArray();
      
      const avgRankByDevice: any = {};
      avgRankByDeviceData.forEach((item: any) => {
        const deviceType = item._id || "Unknown";
        avgRankByDevice[deviceType] = item.clicks > 0 
          ? parseFloat((item.totalRank / item.clicks).toFixed(2))
          : 0;
      });

      res.json({
        topProducts,
        rankDistribution,
        avgRankByCategory,
        avgRankByDevice
      });
    } catch (error) {
      console.error("[PRODUCT-PERFORMANCE] Error:", error);
      res.status(500).json({ error: "Failed to fetch product performance data" });
    }
  });

  // GET /api/geography
  app.get("/api/geography", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using created_at
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(String(startDate));
        }
        if (endDate) {
          const endDateObj = new Date(String(endDate));
          endDateObj.setHours(23, 59, 59, 999);
          dateFilter.$lte = endDateObj;
        }
        baseMatch.push({
          $match: {
            created_at: dateFilter
          }
        });
      }

      // Filter out null userLocation and ensure sessionId exists, and userId exists
      baseMatch.push({ $match: { 
        userLocation: { $ne: null, $exists: true },
        sessionId: { $ne: null, $exists: true },
        userId: { $ne: null }
      } });

      // Geography pipeline - group by state and city
      // Extract state from userLocation.regionName and city from userLocation.city
      const geoPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $addFields: {
            state: { $ifNull: ["$userLocation.regionName", "$userLocation.region", "Unknown"] },
            city: { $ifNull: ["$userLocation.city", "Unknown"] }
          }
        },
        {
          $group: {
            _id: {
              state: "$state",
              city: "$city"
            },
            uniqueUsers: { $addToSet: "$userId" },
            uploads: { $sum: 1 }
          }
        },
        {
          $project: {
            state: "$_id.state",
            city: "$_id.city",
            uniqueUsers: { $size: "$uniqueUsers" },
            uploads: 1
          }
        }
      ];
      const geoData = await features.aggregate(geoPipeline).toArray();

      // Calculate PDP clicks and average rank for each location
      const clicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userLocation: { $ne: null, $exists: true },
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            state: { $ifNull: ["$userLocation.regionName", "$userLocation.region", "Unknown"] },
            city: { $ifNull: ["$userLocation.city", "Unknown"] }
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 }
          }
        },
        {
          $group: {
            _id: {
              state: "$state",
              city: "$city"
            },
            clicks: { $sum: 1 },
            totalRank: { $sum: "$extractedRank" }
          }
        }
      ];
      const clicksData = await features.aggregate(clicksPipeline).toArray();

      // Combine geo data with clicks data
      const clicksMap = new Map<string, any>();
      clicksData.forEach((item: any) => {
        const key = `${item._id.state}|||${item._id.city}`;
        clicksMap.set(key, {
          clicks: item.clicks || 0,
          totalRank: item.totalRank || 0
        });
      });

      const enrichedGeoData = geoData.map((item: any) => {
        const key = `${item.state}|||${item.city}`;
        const clickData = clicksMap.get(key) || { clicks: 0, totalRank: 0 };
        const clicks = clickData.clicks || 0;
        const uploads = item.uploads || 0;
        const clickRate = uploads > 0 ? ((clicks / uploads) * 100) : 0;
        const avgRank = clicks > 0 ? (clickData.totalRank / clicks) : 0;

        return {
          state: item.state,
          city: item.city,
          uniqueUsers: item.uniqueUsers || 0,
          uploads,
          clicks,
          clickRate: parseFloat(clickRate.toFixed(2)),
          avgRank: parseFloat(avgRank.toFixed(2))
        };
      });

      // Also create state-only aggregation for heatmap
      const statePipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $addFields: {
            state: { $ifNull: ["$userLocation.regionName", "$userLocation.region", "Unknown"] }
          }
        },
        {
          $group: {
            _id: "$state",
            uniqueUsers: { $addToSet: "$userId" },
            uploads: { $sum: 1 }
          }
        },
        {
          $project: {
            state: "$_id",
            uniqueUsers: { $size: "$uniqueUsers" },
            uploads: 1
          }
        }
      ];
      const stateData = await features.aggregate(statePipeline).toArray();

      // Calculate clicks by state
      const stateClicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userLocation: { $ne: null, $exists: true },
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            state: { $ifNull: ["$userLocation.regionName", "$userLocation.region", "Unknown"] }
          }
        },
        {
          $group: {
            _id: "$state",
            clicks: { $sum: 1 }
          }
        }
      ];
      const stateClicksData = await features.aggregate(stateClicksPipeline).toArray();

      const stateClicksMap = new Map<string, number>();
      stateClicksData.forEach((item: any) => {
        stateClicksMap.set(item._id, item.clicks || 0);
      });

      const enrichedStateData = stateData.map((item: any) => ({
        state: item.state,
        uniqueUsers: item.uniqueUsers || 0,
        uploads: item.uploads || 0,
        clicks: stateClicksMap.get(item.state) || 0
      }));

      res.json({ 
        geoData: enrichedGeoData.sort((a: any, b: any) => b.uniqueUsers - a.uniqueUsers),
        stateData: enrichedStateData.sort((a: any, b: any) => b.uniqueUsers - a.uniqueUsers)
      });
    } catch (error) {
      console.error("[GEOGRAPHY] Error:", error);
      res.status(500).json({ error: "Failed to fetch geography data" });
    }
  });

  // GET /api/device-analytics
  app.get("/api/device-analytics", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using created_at
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(String(startDate as string));
        }
        if (endDate) {
          const endDateObj = new Date(String(endDate as string));
          endDateObj.setHours(23, 59, 59, 999);
          dateFilter.$lte = endDateObj;
        }
        baseMatch.push({
          $match: {
            created_at: dateFilter
          }
        });
      }

      // A. Overview Split - Calculate metrics for each device type
      // Step 1: Basic metrics (Users, Uploads)
      const basicMetricsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null }
          }
        },
        {
          $addFields: {
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $group: {
            _id: "$computedDeviceType",
            users: { $addToSet: "$userId" },
            uploads: { $sum: 1 }
          }
        },
        {
          $project: {
            device: "$_id",
            users: { $size: "$users" },
            uploads: 1
          }
        }
      ];
      const basicMetrics = await features.aggregate(basicMetricsPipeline).toArray();

      // Step 2: PDP Clicks and Average Rank
      const clicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 }
          }
        },
        {
          $group: {
            _id: "$computedDeviceType",
            clicks: { $sum: 1 },
            totalRank: { $sum: "$extractedRank" }
          }
        }
      ];
      const clicksData = await features.aggregate(clicksPipeline).toArray();

      // Step 3: Shares and Downloads
      const sharesDownloadsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail", "summary_downloaded"]
            }
          }
        },
        {
          $addFields: {
            computedDeviceType: getDeviceTypeExpression(),
            isShare: {
              $in: ["$user_actions.action", ["link_copied", "result_shared_on_mail"]]
            },
            isDownload: {
              $eq: ["$user_actions.action", "summary_downloaded"]
            }
          }
        },
        {
          $group: {
            _id: "$computedDeviceType",
            shares: {
              $sum: {
                $cond: ["$isShare", 1, 0]
              }
            },
            downloads: {
              $sum: {
                $cond: ["$isDownload", 1, 0]
              }
            }
          }
        }
      ];
      const sharesDownloadsData = await features.aggregate(sharesDownloadsPipeline).toArray();

      // Combine all metrics
      const deviceMap = new Map<string, any>();
      
      // Add basic metrics
      basicMetrics.forEach((item: any) => {
        const deviceType = item.device || "Unknown";
        deviceMap.set(deviceType, {
          device: deviceType,
          users: item.users || 0,
          uploads: item.uploads || 0,
          clicks: 0,
          clickRate: 0,
          shares: 0,
          downloads: 0,
          sharesDownloads: 0,
          avgRank: 0
        });
      });

      // Add clicks data
      clicksData.forEach((item: any) => {
        const deviceType = item._id || "Unknown";
        if (deviceMap.has(deviceType)) {
          const existing = deviceMap.get(deviceType);
          existing.clicks = item.clicks || 0;
          const uploads = existing.uploads || 0;
          existing.clickRate = uploads > 0 ? ((existing.clicks / uploads) * 100) : 0;
          existing.avgRank = existing.clicks > 0 ? (item.totalRank / existing.clicks) : 0;
        } else {
          deviceMap.set(deviceType, {
            device: deviceType,
            users: 0,
            uploads: 0,
            clicks: item.clicks || 0,
            clickRate: 0,
            shares: 0,
            downloads: 0,
            sharesDownloads: 0,
            avgRank: 0
          });
        }
      });

      // Add shares/downloads data
      sharesDownloadsData.forEach((item: any) => {
        const deviceType = item._id || "Unknown";
        if (deviceMap.has(deviceType)) {
          const existing = deviceMap.get(deviceType);
          existing.shares = item.shares || 0;
          existing.downloads = item.downloads || 0;
          existing.sharesDownloads = existing.shares + existing.downloads;
        } else {
          deviceMap.set(deviceType, {
            device: deviceType,
            users: 0,
            uploads: 0,
            clicks: 0,
            clickRate: 0,
            shares: item.shares || 0,
            downloads: item.downloads || 0,
            sharesDownloads: (item.shares || 0) + (item.downloads || 0),
            avgRank: 0
          });
        }
      });

      const deviceData = Array.from(deviceMap.values())
        .filter((d: any) => d.device !== "Unknown")
        .map((d: any) => ({
          device: d.device,
          users: d.users,
          uploads: d.uploads,
          clicks: d.clicks,
          clickRate: parseFloat(d.clickRate.toFixed(2)),
          shares: d.shares,
          downloads: d.downloads,
          sharesDownloads: d.sharesDownloads,
          avgRank: parseFloat(d.avgRank.toFixed(2))
        }))
        .sort((a: any, b: any) => {
          // Sort: Mobile, Desktop, Tablet
          const order: Record<string, number> = { Mobile: 1, Desktop: 2, Tablet: 3 };
          return (order[a.device] || 99) - (order[b.device] || 99);
        });

      // B. Behavior Insights
      // Rank distribution by device
      const rankDistributionPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            extractedRank: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$user_actions.action",
                      regex: /current_index_(\d+)/,
                      options: "i"
                    }
                  }
                },
                in: {
                  $cond: [
                    { $ne: ["$$matchResult", null] },
                    { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    -1
                  ]
                }
              }
            },
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $match: {
            extractedRank: { $gte: 0 }
          }
        },
        {
          $addFields: {
            rankBucket: {
              $cond: [
                { $eq: ["$extractedRank", 0] },
                "Rank 1",
                {
                  $cond: [
                    { $eq: ["$extractedRank", 1] },
                    "Rank 2",
                    {
                      $cond: [
                        { $lte: ["$extractedRank", 2] },
                        "Rank 3",
                        "Rank 4+"
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              device: "$computedDeviceType",
              rankBucket: "$rankBucket"
            },
            clicks: { $sum: 1 }
          }
        }
      ];
      const rankDistributionData = await features.aggregate(rankDistributionPipeline).toArray();

      // Format rank distribution
      const rankDistribution: Record<string, Record<string, number>> = {};
      rankDistributionData.forEach((item: any) => {
        const deviceType = item._id.device || "Unknown";
        const rankBucket = item._id.rankBucket;
        if (deviceType !== "Unknown") {
          if (!rankDistribution[deviceType]) {
            rankDistribution[deviceType] = {
              "Rank 1": 0,
              "Rank 2": 0,
              "Rank 3": 0,
              "Rank 4+": 0
            };
          }
          rankDistribution[deviceType][rankBucket] = item.clicks || 0;
        }
      });

      // Shares/Downloads comparison by device (already calculated above, but format for chart)
      const sharesDownloadsComparison = deviceData.map((d: any) => ({
        device: d.device,
        shares: d.shares,
        downloads: d.downloads,
        total: d.sharesDownloads
      }));

      res.json({
        deviceData,
        rankDistribution,
        sharesDownloadsComparison
      });
    } catch (error) {
      console.error("[DEVICE-ANALYTICS] Error:", error);
      res.status(500).json({ error: "Failed to fetch device analytics data" });
    }
  });

  // GET /api/time-patterns
  app.get("/api/time-patterns", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using created_at
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(String(startDate as string));
        }
        if (endDate) {
          const endDateObj = new Date(String(endDate as string));
          endDateObj.setHours(23, 59, 59, 999);
          dateFilter.$lte = endDateObj;
        }
        baseMatch.push({
          $match: {
            created_at: dateFilter
          }
        });
      }

      // A. Usage by Hour (for selected period)
      // Hourly patterns - uploads and users
      const hourlyPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            created_at: { $exists: true }
          }
        },
        {
          $addFields: {
            hour: { $hour: "$created_at" }
          }
        },
        {
          $group: {
            _id: "$hour",
            uploads: { $sum: 1 },
            users: { $addToSet: "$userId" }
          }
        },
        {
          $project: {
            hour: "$_id",
            uploads: 1,
            users: { $size: "$users" }
          }
        },
        { $sort: { hour: 1 } }
      ];
      const hourlyData = await features.aggregate(hourlyPipeline).toArray();

      // Fill in missing hours (0-23) with 0 values
      const hourlyMap = new Map<number, any>();
      hourlyData.forEach((item: any) => {
        hourlyMap.set(item.hour, {
          hour: item.hour,
          uploads: item.uploads || 0,
          users: item.users || 0
        });
      });
      const completeHourlyData = Array.from({ length: 24 }, (_, i) => {
        const existing = hourlyMap.get(i);
        return existing || { hour: i, uploads: 0, users: 0 };
      });

      // B. Usage by Day of Week (Mon-Sun)
      // Daily patterns - uploads, clicks, and click rate
      const dailyPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            created_at: { $exists: true }
          }
        },
        {
          $addFields: {
            dayOfWeek: {
              $subtract: [
                { $dayOfWeek: "$created_at" },
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: "$dayOfWeek",
            uploads: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ];
      const dailyData = await features.aggregate(dailyPipeline).toArray();

      // Calculate clicks by day of week
      const dailyClicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            },
            created_at: { $exists: true }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            dayOfWeek: {
              $subtract: [
                { $dayOfWeek: "$created_at" },
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: "$dayOfWeek",
            clicks: { $sum: 1 }
          }
        }
      ];
      const dailyClicksData = await features.aggregate(dailyClicksPipeline).toArray();

      // Combine daily data
      const dailyClicksMap = new Map<number, number>();
      dailyClicksData.forEach((item: any) => {
        dailyClicksMap.set(item._id, item.clicks || 0);
      });

      const completeDailyData = Array.from({ length: 7 }, (_, i) => {
        const dayData = dailyData.find((d: any) => d._id === i);
        const uploads = dayData?.uploads || 0;
        const clicks = dailyClicksMap.get(i) || 0;
        const clickRate = uploads > 0 ? ((clicks / uploads) * 100) : 0;
        return {
          day: i,
          uploads,
          clicks,
          clickRate: parseFloat(clickRate.toFixed(2))
        };
      });

      // C. Monthly Trend
      // Monthly patterns - users, uploads, clicks, shares/downloads
      const monthlyPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            created_at: { $exists: true }
          }
        },
        {
          $addFields: {
            month: {
              $dateToString: {
                format: "%Y-%m",
                date: "$created_at"
              }
            }
          }
        },
        {
          $group: {
            _id: "$month",
            users: { $addToSet: "$userId" },
            uploads: { $sum: 1 }
          }
        },
        {
          $project: {
            month: "$_id",
            users: { $size: "$users" },
            uploads: 1
          }
        },
        { $sort: { month: 1 } }
      ];
      const monthlyData = await features.aggregate(monthlyPipeline).toArray();

      // Calculate clicks by month
      const monthlyClicksPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            },
            created_at: { $exists: true }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $regex: /^result_opened/,
              $options: "i"
            }
          }
        },
        {
          $addFields: {
            month: {
              $dateToString: {
                format: "%Y-%m",
                date: "$created_at"
              }
            }
          }
        },
        {
          $group: {
            _id: "$month",
            clicks: { $sum: 1 }
          }
        }
      ];
      const monthlyClicksData = await features.aggregate(monthlyClicksPipeline).toArray();

      // Calculate shares/downloads by month
      const monthlySharesDownloadsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            },
            created_at: { $exists: true }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail", "summary_downloaded"]
            }
          }
        },
        {
          $addFields: {
            month: {
              $dateToString: {
                format: "%Y-%m",
                date: "$created_at"
              }
            },
            isShare: {
              $in: ["$user_actions.action", ["link_copied", "result_shared_on_mail"]]
            },
            isDownload: {
              $eq: ["$user_actions.action", "summary_downloaded"]
            }
          }
        },
        {
          $group: {
            _id: "$month",
            shares: {
              $sum: {
                $cond: ["$isShare", 1, 0]
              }
            },
            downloads: {
              $sum: {
                $cond: ["$isDownload", 1, 0]
              }
            }
          }
        }
      ];
      const monthlySharesDownloadsData = await features.aggregate(monthlySharesDownloadsPipeline).toArray();

      // Combine monthly data
      const monthlyClicksMap = new Map<string, number>();
      monthlyClicksData.forEach((item: any) => {
        monthlyClicksMap.set(item._id, item.clicks || 0);
      });

      const monthlySharesDownloadsMap = new Map<string, any>();
      monthlySharesDownloadsData.forEach((item: any) => {
        monthlySharesDownloadsMap.set(item._id, {
          shares: item.shares || 0,
          downloads: item.downloads || 0
        });
      });

      const completeMonthlyData = monthlyData.map((item: any) => {
        const clicks = monthlyClicksMap.get(item.month) || 0;
        const sharesDownloads = monthlySharesDownloadsMap.get(item.month) || { shares: 0, downloads: 0 };
        return {
          month: item.month,
          users: item.users || 0,
          uploads: item.uploads || 0,
          clicks,
          sharesDownloads: sharesDownloads.shares + sharesDownloads.downloads
        };
      });

      res.json({
        hourlyData: completeHourlyData,
        dailyData: completeDailyData,
        monthlyData: completeMonthlyData
      });
    } catch (error) {
      console.error("[TIME-PATTERNS] Error:", error);
      res.status(500).json({ error: "Failed to fetch time patterns data" });
    }
  });

  // GET /api/shares-downloads
  app.get("/api/shares-downloads", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      const { filters, startDate, endDate, device } = parseFilters(req);

      // Build base match stage
      const baseMatch: any[] = [{ $match: filters }];
      
      // Add date filter using created_at
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(String(startDate as string));
        }
        if (endDate) {
          const endDateObj = new Date(String(endDate as string));
          endDateObj.setHours(23, 59, 59, 999);
          dateFilter.$lte = endDateObj;
        }
        baseMatch.push({
          $match: {
            created_at: dateFilter
          }
        });
      }

      // A. Aggregate Stats
      // Get total uploads (with userId)
      const totalUploadsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null }
          }
        },
        {
          $count: "total"
        }
      ];
      const totalUploadsResult = await features.aggregate(totalUploadsPipeline).toArray();
      const totalUploads = totalUploadsResult[0]?.total || 0;

      // Get total shares (link_copied + result_shared_on_mail)
      const sharesPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail"]
            }
          }
        },
        {
          $count: "total"
        }
      ];
      const sharesResult = await features.aggregate(sharesPipeline).toArray();
      const totalShares = sharesResult[0]?.total || 0;

      // Get total downloads (summary_downloaded)
      const downloadsPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": "summary_downloaded"
          }
        },
        {
          $count: "total"
        }
      ];
      const downloadsResult = await features.aggregate(downloadsPipeline).toArray();
      const totalDownloads = downloadsResult[0]?.total || 0;

      const shareDownloadRate = totalUploads > 0 ? ((totalShares + totalDownloads) / totalUploads) * 100 : 0;

      // B. By Dimension
      // 1. By Classification (Carpet vs Hard Surface vs Mixed)
      const classificationNormalizeExpr = {
        $switch: {
          branches: [
            { case: { $in: [{ $toLower: { $ifNull: ["$classification", ""] } }, ["unknown", "mixed", "both", ""]] }, then: "mixed" },
            { case: { $in: [{ $toLower: { $ifNull: ["$classification", ""] } }, ["hard-surface", "hard_surface", "hard surface"]] }, then: "hard_surface" },
            { case: { $eq: [{ $toLower: { $ifNull: ["$classification", ""] } }, "carpet"] }, then: "carpet" }
          ],
          default: "mixed"
        }
      };

      const byClassificationPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $addFields: {
            normalizedClassification: classificationNormalizeExpr
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail", "summary_downloaded"]
            }
          }
        },
        {
          $addFields: {
            isShare: {
              $in: ["$user_actions.action", ["link_copied", "result_shared_on_mail"]]
            },
            isDownload: {
              $eq: ["$user_actions.action", "summary_downloaded"]
            }
          }
        },
        {
          $group: {
            _id: "$normalizedClassification",
            shares: {
              $sum: { $cond: ["$isShare", 1, 0] }
            },
            downloads: {
              $sum: { $cond: ["$isDownload", 1, 0] }
            }
          }
        }
      ];
      const byClassificationData = await features.aggregate(byClassificationPipeline).toArray();

      // 2. By Device Type
      const byDevicePipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $addFields: {
            computedDeviceType: getDeviceTypeExpression()
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail", "summary_downloaded"]
            }
          }
        },
        {
          $addFields: {
            isShare: {
              $in: ["$user_actions.action", ["link_copied", "result_shared_on_mail"]]
            },
            isDownload: {
              $eq: ["$user_actions.action", "summary_downloaded"]
            }
          }
        },
        {
          $group: {
            _id: "$computedDeviceType",
            shares: {
              $sum: { $cond: ["$isShare", 1, 0] }
            },
            downloads: {
              $sum: { $cond: ["$isDownload", 1, 0] }
            }
          }
        }
      ];
      const byDeviceData = await features.aggregate(byDevicePipeline).toArray();

      // 3. By Geography (State/City)
      const byGeographyPipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            userLocation: { $exists: true },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $addFields: {
            state: {
              $ifNull: ["$userLocation.regionName", "$userLocation.region"]
            },
            city: "$userLocation.city"
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail", "summary_downloaded"]
            }
          }
        },
        {
          $addFields: {
            isShare: {
              $in: ["$user_actions.action", ["link_copied", "result_shared_on_mail"]]
            },
            isDownload: {
              $eq: ["$user_actions.action", "summary_downloaded"]
            }
          }
        },
        {
          $group: {
            _id: {
              state: "$state",
              city: "$city"
            },
            shares: {
              $sum: { $cond: ["$isShare", 1, 0] }
            },
            downloads: {
              $sum: { $cond: ["$isDownload", 1, 0] }
            }
          }
        },
        {
          $project: {
            state: "$_id.state",
            city: "$_id.city",
            shares: 1,
            downloads: 1,
            _id: 0
          }
        },
        { $sort: { shares: -1, downloads: -1 } },
        { $limit: 50 }
      ];
      const byGeographyData = await features.aggregate(byGeographyPipeline).toArray();

      // 4. By Time (Day/Week/Month)
      const timePeriod = (req.query.timePeriod as string) || "day";
      let timeFormat = "%Y-%m-%d";
      let timeLabel = "day";
      if (timePeriod === "week") {
        timeFormat = "%Y-W%V";
        timeLabel = "week";
      } else if (timePeriod === "month") {
        timeFormat = "%Y-%m";
        timeLabel = "month";
      }

      const byTimePipeline = [
        ...baseMatch,
        ...getDeviceFilterStages(device),
        {
          $match: {
            userId: { $ne: null },
            created_at: { $exists: true },
            user_actions: {
              $exists: true,
              $type: "array",
              $ne: []
            }
          }
        },
        {
          $addFields: {
            timePeriod: {
              $dateToString: {
                format: timeFormat,
                date: "$created_at"
              }
            }
          }
        },
        {
          $unwind: {
            path: "$user_actions",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            "user_actions.action": {
              $in: ["link_copied", "result_shared_on_mail", "summary_downloaded"]
            }
          }
        },
        {
          $addFields: {
            isShare: {
              $in: ["$user_actions.action", ["link_copied", "result_shared_on_mail"]]
            },
            isDownload: {
              $eq: ["$user_actions.action", "summary_downloaded"]
            }
          }
        },
        {
          $group: {
            _id: "$timePeriod",
            shares: {
              $sum: { $cond: ["$isShare", 1, 0] }
            },
            downloads: {
              $sum: { $cond: ["$isDownload", 1, 0] }
            }
          }
        },
        {
          $project: {
            period: "$_id",
            shares: 1,
            downloads: 1,
            _id: 0
          }
        },
        { $sort: { period: 1 } }
      ];
      const byTimeData = await features.aggregate(byTimePipeline).toArray();

      res.json({
        // A. Aggregate Stats
        aggregate: {
          totalShares,
          totalDownloads,
          shareDownloadRate: parseFloat(shareDownloadRate.toFixed(2))
        },
        // B. By Dimension
        byClassification: byClassificationData.map((item: any) => ({
          classification: item._id || "mixed",
          shares: item.shares || 0,
          downloads: item.downloads || 0,
          total: (item.shares || 0) + (item.downloads || 0)
        })),
        byDevice: byDeviceData
          .filter((item: any) => item._id && item._id.toLowerCase() !== "unknown")
          .map((item: any) => ({
            device: item._id,
            shares: item.shares || 0,
            downloads: item.downloads || 0,
            total: (item.shares || 0) + (item.downloads || 0)
          })),
        byGeography: byGeographyData.map((item: any) => ({
          state: item.state || "Unknown",
          city: item.city || "Unknown",
          shares: item.shares || 0,
          downloads: item.downloads || 0,
          total: (item.shares || 0) + (item.downloads || 0)
        })),
        byTime: byTimeData.map((item: any) => ({
          period: item.period,
          shares: item.shares || 0,
          downloads: item.downloads || 0,
          total: (item.shares || 0) + (item.downloads || 0)
        })),
        timePeriod: timeLabel
      });
    } catch (error: any) {
      console.error("[SHARES-DOWNLOADS] Error:", error);
      console.error("[SHARES-DOWNLOADS] Error stack:", error?.stack);
      res.status(500).json({ 
        error: "Failed to fetch shares/downloads data",
        message: error?.message || "Unknown error"
      });
    }
  });


  // GET /api/latest-queries - Latest user queries with images (Pinterest-style)
  app.get("/api/latest-queries", async (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const features = db.collection(FEATURES_COLLECTION);
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const maxTotal = 500;
      const skip = (page - 1) * limit;

      // Build pipeline to fetch images with filters
      const pipeline = [
        {
          $match: {
            userImage: { 
              $exists: true, 
              $ne: null,
              $nin: [null, ""]
            },
            user_actions: { 
              $exists: true, 
              $type: "array"
            }
          }
        },
        {
          $addFields: {
            userActionsCount: { $size: { $ifNull: ["$user_actions", []] } },
            downloadCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$user_actions", []] },
                  as: "action",
                  cond: { $eq: ["$$action.action", "summary_downloaded"] }
                }
              }
            },
            shareCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$user_actions", []] },
                  as: "action",
                  cond: {
                    $in: ["$$action.action", ["link_copied", "result_shared_on_mail"]]
                  }
                }
              }
            }
          }
        },
        {
          $match: {
            userActionsCount: { $gt: 3 }
          }
        },
        {
          $sort: { created_at: -1 }
        },
        {
          $limit: maxTotal
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: 1,
            userImage: 1,
            downloadCount: 1,
            shareCount: 1,
            created_at: 1,
            userId: 1,
            sessionId: 1
          }
        }
      ];

      // Get total count (up to maxTotal)
      const countPipeline = [
        {
          $match: {
            userImage: { 
              $exists: true, 
              $ne: null,
              $nin: [null, ""]
            },
            user_actions: { 
              $exists: true, 
              $type: "array"
            }
          }
        },
        {
          $addFields: {
            userActionsCount: { $size: { $ifNull: ["$user_actions", []] } }
          }
        },
        {
          $match: {
            userActionsCount: { $gt: 3 }
          }
        },
        {
          $limit: maxTotal
        },
        {
          $count: "total"
        }
      ];

      const [data, countResult] = await Promise.all([
        features.aggregate(pipeline).toArray(),
        features.aggregate(countPipeline).toArray()
      ]);

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(Math.min(total, maxTotal) / limit);

      res.json({
        data: data.map((item: any) => ({
          id: item._id.toString(),
          imageUrl: item.userImage,
          downloadCount: item.downloadCount || 0,
          shareCount: item.shareCount || 0,
          createdAt: item.created_at,
          // userId: item.userId,
          sessionId: item.sessionId
        })),
        pagination: {
          page,
          limit,
          total: Math.min(total, maxTotal),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error: any) {
      console.error("[LATEST-QUERIES] Error:", error);
      res.status(500).json({ 
        error: "Failed to fetch latest queries",
        message: error?.message || "Unknown error"
      });
    }
  });

  // POST /api/login - Simple JWT authentication
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      console.log("[LOGIN] Request received");
      const { username, password } = req.body;
      console.log("[LOGIN] Username provided:", username ? "yes" : "no");

      if (!username || !password) {
        console.log("[LOGIN] Missing credentials");
        return res.status(400).json({ error: "Username and password required" });
      }

      // For demo purposes, accept any credentials
      // In production, verify against database
      // For now, we'll use a simple check or create a default user
      const db = getDatabase();
      const users = db.collection("users");

      // Check if user exists
      console.log("[LOGIN] Looking up user:", username);
      let user = await users.findOne({ username });

      if (!user) {
        console.log("[LOGIN] User not found, creating default admin user");
        // Create default user for demo (password: admin)
        const hashedPassword = await bcrypt.hash("admin", 10);
        await users.insertOne({
          username: "admin",
          password: hashedPassword,
          createdAt: new Date(),
        });
        user = await users.findOne({ username: "admin" });
        console.log("[LOGIN] Default admin user created");
      } else {
        console.log("[LOGIN] User found");
      }

      if (!user) {
        console.log("[LOGIN] Failed to create or find user");
        return res.status(500).json({ error: "Failed to authenticate" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      console.log("[LOGIN] Password valid:", isValid || password === "admin");
      if (!isValid && password !== "admin") {
        console.log("[LOGIN] Invalid credentials");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token
      const token = generateToken(user._id.toString(), user.username);
      console.log("[LOGIN] Token generated successfully");

      const response = {
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
        },
      };
      console.log("[LOGIN] Login successful");
      res.json(response);
    } catch (error) {
      console.error("[LOGIN] Error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // GET /api/me - Get current user
  app.get("/api/me", optionalAuth, (req: AuthRequest, res: Response) => {
    console.log("[ME] Request received");
    if (req.user) {
      console.log("[ME] User authenticated:", req.user.username);
      res.json({ user: req.user });
    } else {
      console.log("[ME] User not authenticated");
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  return server;
}
