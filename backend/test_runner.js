const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const net = require('net');

const movieRoutes = require('./routes/movies');
const userRoutes = require('./routes/users');

const PORT = 5055;
const MONGO_PORT = 27017;
const BASE_URL = `http://127.0.0.1:${PORT}`;
process.env.JWT_SECRET = 'test_secret_key_1234567890';

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const open = await isPortOpen(port);
    if (open) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

let mongodProcess = null;

async function ensureMongo() {
  const alreadyRunning = await isPortOpen(MONGO_PORT);
  if (alreadyRunning) {
    console.log(`[Mongo] Existing MongoDB instance detected on port ${MONGO_PORT}`);
    return;
  }

  const dbPath = path.resolve(__dirname, 'db_data');
  console.log(`[Mongo] Starting mongod on port ${MONGO_PORT} with dbpath: ${dbPath}`);
  
  mongodProcess = spawn('C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe', [
    '--dbpath', dbPath,
    '--port', String(MONGO_PORT),
    '--bind_ip', '127.0.0.1'
  ], {
    stdio: 'inherit',
    windowsHide: true,
  });

  const ready = await waitForPort(MONGO_PORT);
  if (!ready) {
    throw new Error('Failed to start MongoDB server within timeout');
  }
  console.log('[Mongo] MongoDB is ready for connections.');
}

const testResults = [];

function assert(condition, testName, details = '') {
  if (condition) {
    testResults.push({ name: testName, status: 'PASS', details });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    testResults.push({ name: testName, status: 'FAIL', details });
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log(' STARTING MOVIE TRACKER API TEST SUITE ');
  console.log('========================================\n');

  await ensureMongo();

  // Create Express application
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/movies', movieRoutes);
  app.use('/api/users', userRoutes);

  // Connect to test database
  const mongoUri = `mongodb://127.0.0.1:${MONGO_PORT}/movie_tracker_test`;
  await mongoose.connect(mongoUri);
  console.log('[DB] Connected to test database:', mongoUri);

  // Clear test collections for clean run
  if (mongoose.connection.collections.users) {
    await mongoose.connection.collections.users.deleteMany({});
  }
  if (mongoose.connection.collections.movies) {
    await mongoose.connection.collections.movies.deleteMany({});
  }

  // Start test HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[Server] Test server listening on ${BASE_URL}\n`);

  let authToken = null;
  let testUserId = null;
  let createdMovieId1 = null;
  let createdMovieId2 = null;

  // ----------------------------------------------------------------
  // 1. USER AUTHENTICATION TESTS
  // ----------------------------------------------------------------
  console.log('--- SECTION 1: AUTHENTICATION & USER ENDPOINTS ---');

  // Test 1: Register User - Missing fields
  {
    const res = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }), // missing name & password
    });
    const data = await res.json();
    assert(res.status === 400 && data.message === 'All fields are required', 
      'POST /api/users/register - Reject missing required fields',
      `Got status ${res.status}: ${JSON.stringify(data)}`);
  }

  // Test 2: Register User - Success
  {
    const res = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      }),
    });
    const data = await res.json();
    authToken = data.token;
    testUserId = data.user?.id;
    assert(
      res.status === 201 &&
      data.token &&
      data.user?.email === 'jane@example.com' &&
      data.user?.name === 'Jane Doe',
      'POST /api/users/register - Successfully register new user',
      `Got status ${res.status}, user: ${JSON.stringify(data.user)}`
    );
  }

  // Test 3: Register User - Duplicate email
  {
    const res = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Jane',
        email: 'jane@example.com',
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message.includes('already exists'),
      'POST /api/users/register - Reject duplicate email registration',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 4: Login User - Missing credentials
  {
    const res = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com' }), // missing password
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Email and password are required',
      'POST /api/users/login - Reject missing credentials',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 5: Login User - Non-existent user
  {
    const res = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Invalid credentials',
      'POST /api/users/login - Reject non-existent user email',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 6: Login User - Wrong password
  {
    const res = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com', password: 'wrongpassword' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Invalid credentials',
      'POST /api/users/login - Reject incorrect password',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 7: Login User - Success
  {
    const res = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane@example.com', password: 'password123' }),
    });
    const data = await res.json();
    if (data.token) authToken = data.token; // refresh token
    assert(
      res.status === 200 && data.token && data.user?.email === 'jane@example.com',
      'POST /api/users/login - Successful authentication and token issuance',
      `Got status ${res.status}, user: ${JSON.stringify(data.user)}`
    );
  }

  // Test 8: Get Profile - Without Authorization header
  {
    const res = await fetch(`${BASE_URL}/api/users/profile`);
    const data = await res.json();
    assert(
      res.status === 401 && data.message === 'Authorization header required',
      'GET /api/users/profile - Reject request without Authorization header',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 9: Get Profile - Invalid Bearer scheme
  {
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Basic ${authToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.message === 'Bearer token required',
      'GET /api/users/profile - Reject non-Bearer auth scheme',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 10: Get Profile - Invalid token string
  {
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: 'Bearer totally_invalid_token_xyz' },
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.message.includes('Invalid or expired'),
      'GET /api/users/profile - Reject invalid JWT token',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 11: Get Profile - Valid token (Success)
  {
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 200 &&
      data.user?.id === testUserId &&
      data.user?.email === 'jane@example.com' &&
      !data.user?.password,
      'GET /api/users/profile - Successfully fetch user profile without password',
      `Got status ${res.status}, user: ${JSON.stringify(data.user)}`
    );
  }

  // ----------------------------------------------------------------
  // 2. MOVIE CRUD TESTS
  // ----------------------------------------------------------------
  console.log('\n--- SECTION 2: MOVIE CRUD ENDPOINTS ---');

  // Test 12: GET /api/movies - Public list when empty
  {
    const res = await fetch(`${BASE_URL}/api/movies`);
    const data = await res.json();
    assert(
      res.status === 200 && Array.isArray(data) && data.length === 0,
      'GET /api/movies - Retrieve empty movie list without authentication',
      `Got status ${res.status}, count: ${data.length}`
    );
  }

  // Test 13: POST /api/movies - Without auth token
  {
    const res = await fetch(`${BASE_URL}/api/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Interstellar', genre: 'Sci-Fi' }),
    });
    const data = await res.json();
    assert(
      res.status === 401,
      'POST /api/movies - Reject movie creation without token (401)',
      `Got status ${res.status}: ${JSON.stringify(data)}`
    );
  }

  // Test 14: POST /api/movies - Missing title or genre
  {
    const res = await fetch(`${BASE_URL}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ description: 'A great movie without title' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Title and genre are required',
      'POST /api/movies - Reject creation with missing title or genre',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 15: POST /api/movies - Invalid rating (> 10)
  {
    const res = await fetch(`${BASE_URL}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Rating Test Movie',
        genre: 'Action',
        rating: 15, // Max is 10
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message.includes('Rating must be at most 10'),
      'POST /api/movies - Reject movie rating out of bounds (> 10)',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 16: POST /api/movies - Invalid releasedYear (< 1900)
  {
    const res = await fetch(`${BASE_URL}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Old Movie',
        genre: 'History',
        releasedYear: 1850, // Min is 1900
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message.includes('Year must be at least 1900'),
      'POST /api/movies - Reject release year out of bounds (< 1900)',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 17: POST /api/movies - Create Movie 1 Successfully
  {
    const res = await fetch(`${BASE_URL}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Inception',
        description: 'A thief who steals corporate secrets through dream-sharing technology.',
        genre: 'Sci-Fi',
        rating: 8.8,
        releasedYear: 2010,
      }),
    });
    const data = await res.json();
    createdMovieId1 = data._id;
    assert(
      res.status === 201 &&
      data._id &&
      data.title === 'Inception' &&
      data.genre === 'Sci-Fi' &&
      data.rating === 8.8 &&
      data.releasedYear === 2010,
      'POST /api/movies - Successfully create valid Movie 1 (Inception)',
      `Got status ${res.status}, ID: ${createdMovieId1}`
    );
  }

  // Test 18: POST /api/movies - Create Movie 2 Successfully
  {
    const res = await fetch(`${BASE_URL}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'The Dark Knight',
        description: 'Batman raises the stakes in his war on crime against the Joker.',
        genre: 'Action',
        rating: 9.0,
        releasedYear: 2008,
      }),
    });
    const data = await res.json();
    createdMovieId2 = data._id;
    assert(
      res.status === 201 &&
      data._id &&
      data.title === 'The Dark Knight' &&
      data.genre === 'Action',
      'POST /api/movies - Successfully create valid Movie 2 (The Dark Knight)',
      `Got status ${res.status}, ID: ${createdMovieId2}`
    );
  }

  // Test 19: GET /api/movies - Public list contains both movies
  {
    const res = await fetch(`${BASE_URL}/api/movies`);
    const data = await res.json();
    assert(
      res.status === 200 &&
      Array.isArray(data) &&
      data.length === 2 &&
      data.some(m => m._id === createdMovieId1) &&
      data.some(m => m._id === createdMovieId2),
      'GET /api/movies - Fetch all movies list containing newly created movies',
      `Got status ${res.status}, count: ${data.length}`
    );
  }

  // Test 20: GET /api/movies/:id - Public single movie fetch (Success)
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`);
    const data = await res.json();
    assert(
      res.status === 200 &&
      data._id === createdMovieId1 &&
      data.title === 'Inception' &&
      data.rating === 8.8,
      'GET /api/movies/:id - Fetch single movie by valid ID without auth',
      `Got status ${res.status}, title: ${data.title}`
    );
  }

  // Test 21: GET /api/movies/:id - Non-existent valid ObjectId (404)
  {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${BASE_URL}/api/movies/${nonExistentId}`);
    const data = await res.json();
    assert(
      res.status === 404 && data.message === 'Movie not found',
      'GET /api/movies/:id - Return 404 for non-existent ObjectId',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 22: GET /api/movies/:id - Malformed/invalid ID format (400)
  {
    const res = await fetch(`${BASE_URL}/api/movies/invalid-id-12345`);
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Invalid movie ID',
      'GET /api/movies/:id - Return 400 for malformed ID string',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 23: PUT /api/movies/:id - Without auth token (401)
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 9.2 }),
    });
    const data = await res.json();
    assert(
      res.status === 401,
      'PUT /api/movies/:id - Reject movie update without token (401)',
      `Got status ${res.status}: ${JSON.stringify(data)}`
    );
  }

  // Test 24: PUT /api/movies/:id - Non-existent valid ObjectId (404)
  {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${BASE_URL}/api/movies/${nonExistentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'New Title', genre: 'Sci-Fi' }),
    });
    const data = await res.json();
    assert(
      res.status === 404 && data.message === 'Movie not found',
      'PUT /api/movies/:id - Return 404 when updating non-existent movie',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 25: PUT /api/movies/:id - Malformed ID string (400)
  {
    const res = await fetch(`${BASE_URL}/api/movies/bad-id-xyz`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'New Title', genre: 'Sci-Fi' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Invalid movie ID',
      'PUT /api/movies/:id - Return 400 for malformed ID string',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 26: PUT /api/movies/:id - Successful update
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Inception (Extended Cut)',
        description: 'An updated mind-bending journey through nested dream layers.',
        genre: 'Sci-Fi / Thriller',
        rating: 9.5,
        releasedYear: 2010,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 200 &&
      data._id === createdMovieId1 &&
      data.title === 'Inception (Extended Cut)' &&
      data.rating === 9.5 &&
      data.genre === 'Sci-Fi / Thriller',
      'PUT /api/movies/:id - Successfully update movie fields',
      `Got status ${res.status}, title: ${data.title}, rating: ${data.rating}`
    );
  }

  // Test 27: Verify update via GET /api/movies/:id
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`);
    const data = await res.json();
    assert(
      res.status === 200 &&
      data.title === 'Inception (Extended Cut)' &&
      data.rating === 9.5 &&
      data.description.includes('nested dream layers'),
      'GET /api/movies/:id - Verify updated movie state persists in database',
      `Title: ${data.title}, Rating: ${data.rating}`
    );
  }

  // Test 28: DELETE /api/movies/:id - Without auth token (401)
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    assert(
      res.status === 401,
      'DELETE /api/movies/:id - Reject movie deletion without token (401)',
      `Got status ${res.status}: ${JSON.stringify(data)}`
    );
  }

  // Test 29: DELETE /api/movies/:id - Malformed ID string (400)
  {
    const res = await fetch(`${BASE_URL}/api/movies/bad-id-xyz`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message === 'Invalid movie ID',
      'DELETE /api/movies/:id - Return 400 for malformed ID string',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 30: DELETE /api/movies/:id - Non-existent valid ObjectId (404)
  {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${BASE_URL}/api/movies/${nonExistentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 404 && data.message === 'Movie not found',
      'DELETE /api/movies/:id - Return 404 when deleting non-existent movie',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 31: DELETE /api/movies/:id - Successful deletion of Movie 1
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.message === 'Movie deleted successfully',
      'DELETE /api/movies/:id - Successfully delete movie with auth token',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 32: Verify deletion via GET /api/movies/:id
  {
    const res = await fetch(`${BASE_URL}/api/movies/${createdMovieId1}`);
    const data = await res.json();
    assert(
      res.status === 404 && data.message === 'Movie not found',
      'GET /api/movies/:id - Confirm deleted movie is no longer found (404)',
      `Got status ${res.status}: ${data.message}`
    );
  }

  // Test 33: Confirm remaining movie count is 1
  {
    const res = await fetch(`${BASE_URL}/api/movies`);
    const data = await res.json();
    assert(
      res.status === 200 && data.length === 1 && data[0]._id === createdMovieId2,
      'GET /api/movies - Confirm remaining movie list reflects deleted item',
      `Remaining count: ${data.length}, Remaining movie ID: ${data[0]?._id}`
    );
  }

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n========================================');
  console.log('            TEST RESULTS SUMMARY        ');
  console.log('========================================');
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Total Tests Run : ${testResults.length}`);
  console.log(`Passed          : ${passed}`);
  console.log(`Failed          : ${failed}`);
  console.log('========================================\n');

  // Cleanup
  await mongoose.disconnect();
  server.close();
  if (mongodProcess) {
    console.log('[Cleanup] Terminating mongod process...');
    mongodProcess.kill();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('[Error] Unexpected error running tests:', err);
  if (mongodProcess) mongodProcess.kill();
  process.exit(1);
});
