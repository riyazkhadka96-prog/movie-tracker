# Movie Tracker - MERN Stack Assessment Project (JavaScript Version)

## Overview
A simple MERN (MongoDB, Express, React, Node.js) stack application for tracking movies with full CRUD operations and user authentication. Designed for API testing in Postman using JavaScript (JSX) instead of TypeScript (TSX).

## Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas cloud connection)

### Installation

**1. Backend Setup**
```bash
cd movie-tracker/backend
npm install          # Install dependencies
# Create .env file:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/movie_tracker
# JWT_SECRET=super-secret-key-change-me

# Start server:
npm run dev           # Uses nodemon - runs on http://localhost:5000
# or: npm start
```

**2. Frontend Setup**
```bash
cd movie-tracker/frontend
npm install           # Install React dependencies
npm start             # Runs on http://localhost:3000
```

## CI Pipeline

GitHub Actions runs the workflow in `.github/workflows/ci.yml` on pull requests and pushes to `main`. It runs the backend integration tests against a MongoDB service and builds the React frontend. AWS deployment is kept separate so CI does not depend on temporary student-lab credentials.

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users/register` | Register new user | No |
| POST | `/api/users/login` | Login & get JWT token | No |
| GET | `/api/users/profile` | Get current user profile | Yes (Bearer token) |

**Request Body - Register:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "123456"
}
```

**Request Body - Login:**
```json
{
  "email": "john@example.com",
  "password": "123456"
}
```

**Response:** JWT token + user details for use in subsequent requests.

### Movie Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/movies` | List all movies | No |
| GET | `/api/movies/:id` | Get single movie by ID | No |
| POST | `/api/movies` | Create new movie | Yes |
| PUT | `/api/movies/:id` | Update existing movie | Yes |
| DELETE | `/api/movies/:id` | Delete movie | Yes |

**Request Body - Create/Update Movie:**
```json
{
  "title": "Inception",
  "description": "A thief who steals corporate secrets...",
  "genre": "Sci-Fi",
  "rating": 8.5,
  "releasedYear": 2010
}
```

## Postman Testing Workflow

1. **Start both servers** (backend on 5000, frontend on 3000)
2. **Register a new user** via POST `http://localhost:5000/api/users/register`
3. **Login** via POST `http://localhost:5000/api/users/login` - receive JWT token
4. **Use Token**: Copy the token and set it in Postman Authorization tab as "Bearer Token"
5. **Test Protected Routes**: Use the token to access `/api/users/profile`, `/api/movies` (POST/PUT/DELETE)
6. **Test Public Routes**: Access `/api/movies` and `/api/movies/:id` without authentication

## Features Included

✅ **User Authentication**
- Registration with name, email, password
- Login with JWT token generation  
- Password bcrypt hashing (10 salt rounds)
- Token-based auth for protected routes
- Token expiration (1 hour)

✅ **Movie CRUD Operations**
- Create movies with title, description, genre, rating (0-10), and release year
- Read all movies or single movie details
- Update movie information
- Delete movies

✅ **React Frontend (JavaScript/JSX)**
- Login/Register forms (plain JavaScript, no TypeScript)
- Add movie form with validation
- Movie list display
- Edit/delete functionality
- JWT token storage in localStorage

✅ **Backend Security**
- CORS configured for localhost:3000
- Input validation on required fields
- Proper HTTP status codes
- Error handling middleware

✅ **Development Experience**
- nodemon for auto-restart during development
- Environment variables via .env
- JavaScript (JSX) for frontend - no TypeScript
- Clean project structure

## Project Avoids
❌ TODO/note-taking applications
❌ Complex real-time features
❌ Over-engineered architecture
❌ External API integrations
❌ TypeScript (uses plain JavaScript/JSX as requested)

## Technology Stack

**Backend:**
- Node.js with Express
- MongoDB with Mongoose ODM
- bcrypt for password hashing
- jsonwebtoken for authentication
- dotenv for configuration
- nodemon for development

**Frontend:**
- React with JavaScript (JSX)
- No TypeScript - plain JSX syntax
- Axios for HTTP requests
- CSS3 for styling

## File Summary

```
backend/
├── index.js                 # Server entry point
├── .env                     # Environment config
├── package.json             # Dependencies + npm scripts
├── node_modules/
├── models/
│   ├── User.js
│   └── Movie.js
├── middleware/
│   └── auth.js
└── routes/
    ├── movies.js
    └── users.js

frontend/
├── package.json
├── node_modules/
├── public/
│   └── index.html
└── src/
    ├── App.js               # Main component (auth + CRUD UI, JSX)
    ├── App.css
    └── index.js             # React entry point
```

## Testing the APIs

### Using Python requests:
```python
import requests

# Register
r = requests.post('http://localhost:5000/api/users/register', 
                  json={'name': 'John Doe', 'email': 'john@example.com', 'password': 'password123'})
print(r.status_code, r.json())

# Login
r = requests.post('http://localhost:5000/api/users/login', 
                  json={'email': 'john@example.com', 'password': 'password123'})
token = r.json()['token']

# Use token in subsequent requests
headers = {'Authorization': f'Bearer {token}'}
r = requests.get('http://localhost:5000/api/users/profile', headers=headers)
print(r.json())

# Movies CRUD with auth
r = requests.get('http://localhost:5000/api/movies', headers=headers)
```

### Using cURL:
```bash
# Register
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get movies (no auth needed)
curl http://localhost:5000/api/movies

# Get movies with auth
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/movies
```

## npm Scripts

**Backend (movie-tracker/backend):**
- `npm start` - Start server with Node.js
- `npm run dev` - Start server with nodemon (auto-restart on changes)

**Frontend (movie-tracker/frontend):**
- `npm start` - Start React development server (port 3000)
- `npm run build` - Build for production
- `npm test` - Run test suite