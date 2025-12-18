# EF Color Match Dashboard

A full-stack analytics dashboard for EF Color Match application built with Express, React, TypeScript, MongoDB, and Recharts.

## Features

- ✅ Complete dashboard with 8 analytics pages
- ✅ Real-time MongoDB aggregations
- ✅ Advanced filtering (date range, classification, device, location)
- ✅ CSV export functionality
- ✅ JWT authentication support
- ✅ Responsive UI with TailwindCSS
- ✅ Interactive charts with Recharts

## Tech Stack

- **Backend**: Express.js, TypeScript, MongoDB
- **Frontend**: React, TypeScript, Vite, Wouter
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **State Management**: TanStack Query
- **Authentication**: JWT

## Prerequisites

- Node.js 20+ 
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file in the root directory with:
   ```env
   MONGODB_URL=your_mongodb_connection_string
   MONGODB_DB=recommendation_db
   NEW_PRODUCTS_COLLECTION=ef_products
   NEW_FEATURES_COLLECTION=ef_features
   PORT=5000
   JWT_SECRET=your-secret-key-change-in-production
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

All endpoints support query filters: `?startDate=&endDate=&classification=&device=&state=&city=`

- `GET /api/overview` - Overview statistics and KPIs
- `GET /api/returning-users` - Returning user analytics
- `GET /api/category-summary` - Category comparison data
- `GET /api/product-performance` - Product/SKU performance metrics
- `GET /api/geography` - Geographic distribution data
- `GET /api/device-analytics` - Device usage analytics
- `GET /api/time-patterns` - Time-based usage patterns
- `GET /api/shares-downloads` - Share and download metrics
- `GET /api/recent-queries` - Recent high-engagement queries
- `POST /api/login` - JWT authentication
- `GET /api/me` - Get current user

## Dashboard Pages

- `/dashboard/overview` - Main dashboard with KPIs and charts
- `/dashboard/returning-users` - User retention and loyalty metrics
- `/dashboard/category-comparison` - Carpet vs Hard Surface analysis
- `/dashboard/product-performance` - SKU-level performance analysis
- `/dashboard/geography` - Geographic distribution and regional performance
- `/dashboard/device-analytics` - Mobile vs Desktop analytics
- `/dashboard/time-patterns` - Hourly and daily usage patterns
- `/dashboard/shares-downloads` - Social engagement metrics

## Database Schema

### ef_features Collection
- `sessionId` - User session identifier
- `classification` - Surface type (hard_surface / carpet / both)
- `userImage` - Uploaded image URL
- `userIpAddress` - User IP address
- `userLocation` - Location object with state and city
- `segmentation_success` - Boolean flag
- `searchResults` - Array of SKUs
- `imageWasResized` - Boolean flag
- `createdAt` - Timestamp
- `deviceType` - Device type (mobile/desktop/tablet)

### ef_products Collection
- `sku` - Product SKU
- `productName` - Product name
- Other product details

## Features

### Filtering
All dashboard pages support comprehensive filtering:
- **Date Range**: Select start and end dates
- **Classification**: Filter by surface type (carpet, hard_surface, both)
- **Device**: Filter by device type (mobile, desktop, tablet)
- **Location**: Filter by state and city

### CSV Export
All tables and data visualizations support CSV export functionality.

### Authentication
JWT-based authentication is implemented. Default credentials:
- Username: `admin`
- Password: `admin`

**Note**: Change the default password in production!

## Development

The project uses:
- **Vite** for frontend development and building
- **tsx** for running TypeScript server code
- **esbuild** for server bundling
- **dotenv** for environment variable management

## Troubleshooting

### Windows Compatibility
The server is configured to work on Windows. If you encounter port binding issues, ensure:
- Port 5000 is not in use by another application
- Firewall allows connections on port 5000

### MongoDB Connection
Ensure your MongoDB connection string is correct and the database is accessible. The application will exit if it cannot connect to MongoDB.

## License

MIT

