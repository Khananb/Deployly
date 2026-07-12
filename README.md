# Deployly - Hosting Engine MVP

Deployly is a modern, lightweight web hosting control panel and deployment engine designed for simple Static HTML and Node.js application hosting. It aims to eliminate deployment complexity with a clean dashboard and instant ZIP-based deployments.

## Project Overview
This repository contains the backend and frontend for the Deployly MVP. It features a complete authentication flow, domain management, database records (logical representation), and a deployment extraction engine.

## Folder Structure
```
deployly/
├── backend/
│   ├── config/          # Environment and mock DB configuration
│   ├── controllers/     # API logic for Auth, Dashboard, Domains, Websites
│   ├── middleware/      # Express middlewares (auth, validation, etc.)
│   ├── models/          # SQL statement abstractions
│   ├── routes/          # Express route definitions
│   ├── services/        # Reusable service functions
│   ├── utils/           # Utilities like `apiResponse` and `multerConfig`
│   └── server.js        # Entry point for backend API (Port 4000/3000)
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (Dashboard, Websites, Auth, Domains)
│   │   ├── utils/       # API fetch wrappers and helpers
│   │   ├── App.jsx      # Main React application entry
│   │   └── main.jsx     # Vite DOM renderer
│   ├── package.json
│   └── vite.config.js
└── docs/                # Contains sprint reports and implementation plans
```

## Environment Variables
Create a `.env` file in the `backend/` directory:
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
```

## Installation & How to Run Locally

### 1. Backend
```bash
cd backend
npm install
npm run dev
```
*The API will start on `http://localhost:3000`*

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
*The React app will start on `http://localhost:5173`*

## API Summary
- `POST /api/auth/register` - Create an account
- `POST /api/auth/login` - Authenticate
- `GET /api/auth/profile` - Fetch user profile details
- `GET /api/dashboard` - Get dashboard statistics
- `POST /api/websites` - Add a new website record
- `POST /api/websites/:id/upload` - Upload a ZIP and deploy it
- `GET /api/deployments/:deploymentId/logs` - Fetch live deployment logs
- `POST /api/domains` - Link a custom domain
- `POST /api/databases` - Create a logical MySQL database

## Current MVP Features
- **Authentication**: JWT-based login and registration.
- **Websites**: Full CRUD capabilities and logical management.
- **Deployment Engine**:
  - Validates and uploads `.zip` archives.
  - Safely extracts into `storage/sites/`.
  - Auto-detects if the app is `Static HTML` or `Node.js` based on `index.html` and `package.json`.
- **Real-Time Logs**: View deployment logs and status directly from the Website Details page.
- **Domains & Databases**: Ready APIs to orchestrate domains and databases on a real VPS.
