# Agent Instructions for Matcha Project

## Project Overview

**Matcha** is a 42 school project aimed at creating a cat dating website. The application allows users to register, create profiles, and find potential matches based on various criteria.

### Tech Stack

| Technology | Purpose |
|------------|---------|
| JavaScript/Node.js | Backend runtime |
| Express.js | Web framework |
| PostgreSQL | Database |
| HTML/CSS | Frontend (server-rendered pages) |
| bcrypt | Password hashing |
| express-session | Session management |
| multer | File upload handling |

---

## Project Structure

```
matcha/
├── server.js              # Main entry point - Express server setup
├── package.json           # Dependencies and scripts
├── Makefile               # Build automation (init-db, clean-db, dev, production)
├── .env                   # Environment variables (SESSION_SECRET, DB_PASSWORD)
│
├── config/                # Configuration files
│   ├── db.js              # PostgreSQL connection pool
│   └── session.js         # Express session middleware config
│
├── routes/                # API route definitions
│   ├── auth.routes.js     # Authentication endpoints (login, register, logout)
│   └── profile.routes.js  # Profile setup and management endpoints
│
├── middlewares/           # Express middlewares
│   ├── isAuthenticated.js # Session-based auth check
│   └── isProfileComplete.js # Ensures user has completed profile
│
├── pages/                 # Server-rendered HTML pages
│   ├── index.html         # Home page
│   ├── about.html         # About page
│   ├── contact.html       # Contact page
│   ├── auth.html          # Login/Register forms
│   ├── dashboard.html     # Protected user dashboard
│   ├── profile-setup.html # Profile completion form
│   └── 404.html           # Error page
│
├── scripts/               # Database management scripts
│   ├── initDB.js          # Creates database tables and seeds tags
│   └── cleanDB.js         # Drops database tables
│
├── uploads/               # User uploaded files
│   └── photos/            # User profile photos
│
├── events/                # Event system
│   └── logger.js          # Page visit logging via EventEmitter
│
└── logs/                  # Application logs
    └── page_visits.log    # Visit tracking
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    sexual_preference VARCHAR(20),
    biography TEXT,
    profile_complete BOOLEAN DEFAULT FALSE,
    last_logout TIMESTAMP,
    score INT DEFAULT 1000
);
```

### Tags Table (Predefined Interest Tags)

```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
```

**Predefined tags**: Napping, Sunbathing, Chasing lasers, Playing with strings, Climbing furniture, Bird watching, Window gazing, Box exploring, Cuddling, Being brushed, Hunting toys, Night zoomies, Eating treats, Watching humans, Knocking things off tables, Sleeping on keyboards, Scratching posts, Hiding in small spaces, Exploring new places, Listening to rain

### User Tags Junction Table

```sql
CREATE TABLE user_tags (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tag_id)
);
```

### User Photos Table

```sql
CREATE TABLE user_photos (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    is_profile_photo BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

---

## Available Endpoints

| Method | Endpoint | Auth Required | Profile Required | Description |
|--------|----------|---------------|------------------|-------------|
| GET | `/` | No | No | Home page |
| GET | `/about` | No | No | About page |
| GET | `/contact` | No | No | Contact page |
| GET | `/auth` | No | No | Login/Register page |
| GET | `/dashboard` | Yes | Yes | User dashboard |
| POST | `/auth/login` | No | No | User login |
| POST | `/auth/register` | No | No | User registration |
| POST | `/auth/logout` | No | No | User logout |
| GET | `/profile/setup` | Yes | No | Profile completion form |
| POST | `/profile/setup` | Yes | No | Submit profile data |
| GET | `/profile/api/tags` | Yes | No | Get all available tags |
| GET | `/uploads/photos/:filename` | Yes | No | Serve uploaded photos |

---

## User Flow

```
Register → /profile/setup (required) → Complete form → /dashboard
                ↑                            |
                └────── If incomplete ───────┘
```

1. User registers at `/auth`
2. Automatically redirected to `/profile/setup`
3. User fills in: Gender, Sexual preference, Biography, Interest tags, Photos
4. On submit, `profile_complete = TRUE` and user redirected to `/dashboard`
5. Any attempt to access `/dashboard` with incomplete profile redirects to `/profile/setup`

---

## How to Run

```bash
# Initialize database and start in development mode (with nodemon)
make dev

# Initialize database and start in production mode
make all

# Just start the server
npm start

# Database management
make init-db    # Initialize database tables
make clean-db   # Drop database tables
```

---

## Agent Communication Guidelines

### Explanation Style: Comprehensive

When completing tasks, I will provide:

1. **What changed**: Specific files modified with line numbers
2. **Why it changed**: The reasoning behind each modification
3. **Alternatives considered**: Other approaches that were evaluated
4. **Potential impacts**: Side effects or considerations for future development

### Code References

I will always include file paths and line numbers when referencing code:
- Format: `file_path:line_number`
- Example: "The authentication logic is handled in `routes/auth.routes.js:15`"

### Context Level

I will provide background context when explaining changes, assuming you may need reminders about:
- How different parts of the codebase connect
- Why certain patterns are used
- What dependencies or side effects exist

### Coherence

I will maintain consistency with:
- Existing code style and patterns in the project
- Naming conventions already established
- Project structure and organization

---

## Current Development State

The project is in **active development** with authentication and profile system implemented.

### Implemented Features
- User registration and login
- Session-based authentication
- Basic page routing
- Page visit logging
- **Profile completion system**:
  - Gender selection (Male/Female/Other)
  - Sexual preference (Male/Female/Both)
  - Biography
  - Interest tags (20 predefined cat-themed tags)
  - Photo upload (up to 5 photos, one as profile photo)
- Profile completion enforcement (users must complete profile to access dashboard)

### Pending Features (typical for 42 Matcha)
- GPS-based location
- Matching algorithm and filters
- Like/Unlike functionality
- User browsing and suggestions
- Real-time chat (Socket.io)
- Notifications system
- Email verification
- Profile completeness scoring
- Profile editing

---

## Notes for Development

- Database is managed via scripts in `/scripts/` (no formal migration system yet)
- Routes currently handle business logic directly (no controller/service separation)
- No input validation library is currently in use
- Frontend uses inline styles (no separate CSS files)
- No testing framework is set up yet
- Photos are stored locally in `/uploads/photos/` with naming convention: `userId_timestamp_originalname`
- Photo uploads limited to JPEG/PNG, max 5MB per file

---

## Agent Self-Maintenance

**Important**: This `agent.MD` file must be kept up-to-date as the project evolves.

### When to Update This File

Update this document when:

1. **New features are implemented**: Add them to the "Implemented Features" section and remove from "Pending Features"
2. **New files/directories are created**: Update the project structure diagram
3. **Database schema changes**: Update the schema section with new tables or columns
4. **New endpoints are added**: Add them to the endpoints table
5. **New dependencies are added**: Update the tech stack if significant
6. **Development patterns change**: Update notes (e.g., if controllers/services layer is added)

### Update Format

When updating, include:
- Date of the change
- Brief description of what was added/modified
- Relevant file paths

---

## Changelog

| Date | Change | Files Affected |
|------|--------|----------------|
| Initial | Project bootstrap with authentication | `server.js`, `routes/auth.routes.js`, `config/*` |
| Jan 2026 | Added profile completion system with gender, preferences, bio, tags, and photo upload | `scripts/initDB.js`, `routes/profile.routes.js`, `pages/profile-setup.html`, `middlewares/isProfileComplete.js`, `server.js` |
