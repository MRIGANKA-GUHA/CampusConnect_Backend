# CampusConnect Backend

This is the backend repository for the CampusConnect Application. It is built using Node.js and Express.js, providing robust, scalable APIs to power the CampusConnect frontend.

## 🚀 Key Features & Capabilities

The backend handles all business logic, data persistence, authentication validation, and external integrations for the platform.

- **Role-Based API Access**: Dedicated route groupings for `Admin`, `Club`, and `Student` roles with robust middleware authorization.
- **Firebase Admin SDK Integration**: Uses Firebase Firestore as the primary database, managing collections for Users, Clubs, Events, and Notices.
- **Generative AI Features**: Integrated with `@google/generative-ai` for AI-powered capabilities (e.g., content generation or smart parsing).
- **Document Parsing**: Uses `pdf-parse` for extracting data from documents.
- **Media Uploads**: Integrates `multer` and `cloudinary` for seamless image/avatar and event poster uploads.
- **Email Notifications**: Utilizes `nodemailer` to send automated emails (e.g., event reminders, verification emails).
- **Security & Auth**: Uses `bcrypt` for local hashing (if applicable) and standard CORS/JSON body parsing. 

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js (v5)
- **Database**: Firebase (Firestore via `firebase-admin`)
- **File Uploads**: Multer, Cloudinary
- **Emails**: Nodemailer
- **AI/Parsing**: Google Generative AI, PDF-Parse
- **Security/Utils**: Cors, Dotenv, Bcrypt

## 📁 Project Structure

```text
src/
├── controllers/    # Request handlers containing business logic
├── db/             # Database connection and initialization (Firebase setup)
├── middlewares/    # Custom middlewares (Authentication, Role checking e.g., isClub)
├── models/         # Data models and standard schemas mapping to Firestore
│   ├── Club.js
│   ├── Event.js
│   ├── Notice.js
│   └── User.js
├── routes/         # Express route definitions
│   ├── adminRoutes.js
│   ├── aiRoutes.js
│   ├── authRoutes.js
│   ├── clubRoutes.js
│   └── studentRoutes.js
├── services/       # External service integrations (Cloudinary, Nodemailer, AI)
├── utils/          # Helper functions and utilities
├── validators/     # Request payload validation logic
├── app.js          # Express app configuration and middleware setup
└── index.js        # Server entry point
```

## ⚙️ Setup Instructions

1. **Navigate to the backend directory**:
   ```bash
   cd CampusConnect_Backend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file in the root directory. You will need to provide configurations for:
   - `PORT` (e.g., 5000)
   - Firebase Service Account credentials
   - Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
   - Nodemailer SMTP credentials
   - Google Gemini AI API Key
4. **Start the server**:
   ```bash
   npm start
   ```
   *For development mode with auto-reloading (nodemon):*
   ```bash
   npm run dev
   ```

## 🌐 API Overview
The backend exposes RESTful endpoints grouped by domain:
- `/api/auth` - Authentication and session management
- `/api/admin` - Admin-level operations
- `/api/club` - Club-specific operations (managing events, notices, profile)
- `/api/student` - Student-specific operations (fetching feeds, joining clubs)
- `/api/ai` - AI-powered endpoints
