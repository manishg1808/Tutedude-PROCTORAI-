# 🚀 Deployment Guide

This guide will help you deploy the Video Proctoring System to production.

## 📋 Prerequisites

- GitHub account
- Vercel account (for frontend)
- Render account (for backend)
- MySQL database (can use Render's PostgreSQL or external MySQL)

## 🌐 Frontend Deployment (Vercel)

### 1. Prepare Frontend for Deployment

1. **Set Environment Variables:**
   ```bash
   cd frontend
   ```
   
   Create `.env.production` file:
   ```env
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   REACT_APP_SERVER_URL=https://your-backend-url.onrender.com
   GENERATE_SOURCEMAP=false
   ```

### 2. Deploy to Vercel

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings:**
   - Framework Preset: `Create React App`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

3. **Environment Variables:**
   - Add `REACT_APP_API_URL` with your backend URL
   - Add `REACT_APP_SERVER_URL` with your backend URL

4. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete

## 🖥️ Backend Deployment (Render)

### 1. Prepare Backend for Deployment

1. **Set Environment Variables:**
   ```bash
   cd backend
   ```
   
   Create `.env.production` file:
   ```env
   NODE_ENV=production
   PORT=10000
   DB_HOST=your-db-host
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=Tutedudedb
   JWT_SECRET=your-super-secret-jwt-key
   ```

### 2. Deploy to Render

1. **Connect Repository:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service:**
   - Name: `proctorai-backend`
   - Environment: `Node`
   - Region: Choose closest to your users
   - Branch: `main` (or your main branch)
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables:**
   - Add all variables from your `.env.production` file
   - Make sure to use secure, random values for `JWT_SECRET`

4. **Advanced Settings:**
   - Instance Type: `Free` (or upgrade for better performance)
   - Auto-Deploy: `Yes`

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete

## 🗄️ Database Setup

### Option 1: Render PostgreSQL (Recommended)

1. **Create Database:**
   - Go to Render Dashboard
   - Click "New +" → "PostgreSQL"
   - Name: `proctorai-db`
   - Region: Same as backend
   - Plan: `Free` (or upgrade)

2. **Update Backend Environment:**
   - Use the provided database URL
   - Update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Option 2: External MySQL

1. **Use Services Like:**
   - PlanetScale
   - AWS RDS
   - Google Cloud SQL
   - Any MySQL hosting service

2. **Update Connection Details:**
   - Update backend environment variables
   - Ensure database is accessible from Render

## 🔧 Post-Deployment Configuration

### 1. Update CORS Settings

In `backend/server.js`, update CORS origin:
```javascript
app.use(cors({
  origin: [
    "https://your-frontend-url.vercel.app",
    "http://localhost:3000" // for development
  ],
  credentials: true
}));
```

### 2. Update Socket.IO CORS

In `backend/server.js`, update Socket.IO CORS:
```javascript
const io = socketIo(server, {
  cors: {
    origin: [
      "https://your-frontend-url.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"]
  }
});
```

### 3. Test Deployment

1. **Frontend Tests:**
   - Visit your Vercel URL
   - Test user registration/login
   - Test interview functionality

2. **Backend Tests:**
   - Test API endpoints
   - Test WebSocket connections
   - Test database connections

## 🔐 Security Considerations

### 1. Environment Variables
- Use strong, unique JWT secrets
- Don't commit `.env` files to Git
- Use different secrets for different environments

### 2. Database Security
- Use strong database passwords
- Enable SSL connections
- Restrict database access by IP

### 3. API Security
- Rate limiting is enabled
- Helmet.js for security headers
- CORS properly configured

## 📊 Monitoring and Maintenance

### 1. Logs
- Monitor Render logs for backend issues
- Monitor Vercel logs for frontend issues
- Set up error tracking (Sentry, LogRocket)

### 2. Performance
- Monitor database performance
- Monitor API response times
- Set up uptime monitoring

### 3. Updates
- Keep dependencies updated
- Monitor security vulnerabilities
- Regular database backups

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Check CORS configuration in backend
   - Ensure frontend URL is in allowed origins

2. **Database Connection Issues:**
   - Verify database credentials
   - Check database accessibility
   - Ensure database exists

3. **Build Failures:**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check build logs for specific errors

4. **WebSocket Issues:**
   - Verify Socket.IO CORS settings
   - Check firewall settings
   - Test WebSocket connections

### Getting Help:

1. Check deployment logs
2. Verify environment variables
3. Test locally first
4. Check service status pages

## 📈 Scaling Considerations

### For High Traffic:

1. **Backend:**
   - Upgrade Render plan
   - Use multiple instances
   - Implement load balancing

2. **Database:**
   - Use managed database service
   - Implement database pooling
   - Add read replicas

3. **CDN:**
   - Use Vercel's CDN
   - Implement caching strategies
   - Optimize asset delivery

---

🎉 **Congratulations!** Your Video Proctoring System is now deployed and ready for production use!
