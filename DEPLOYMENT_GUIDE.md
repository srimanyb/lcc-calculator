# 🚀 Vercel Deployment Guide

To fix the **"Database is currently unavailable"** error on your Vercel site, you need to connect a Cloud Database (MongoDB Atlas). 

Follow these 3 steps exactly:

### 1. Create a Free Database on MongoDB Atlas
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Free Cluster**.
3. Under **Security > Database Access**, create a user with a username and password (write these down!).
4. Under **Security > Network Access**, click **Add IP Address** and select **Allow Access from Anywhere** (0.0.0.0/0).
5. Go to **Deployment > Database**, click **Connect**, then choose **Drivers**.
6. Copy the connection string. Replace `<password>` with your actual password.

### 2. Configure Vercel Environment Variables
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click on your project.
3. Go to **Settings > Environment Variables**.
4. Add the following:
   - **Key**: `MONGO_URI` | **Value**: (Your Atlas string)
   - **Key**: `JWT_SECRET` | **Value**: (Any random string)

### 3. Redeploy
1. Go to the **Deployments** tab in Vercel.
2. Click the three dots `...` on the latest build and select **Redeploy**.

---
*Note: Localhost works because it uses your computer's local MongoDB. Vercel needs Atlas to store data in the cloud.*
