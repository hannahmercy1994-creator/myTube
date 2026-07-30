# MyTube

A self-hosted web application to organize your YouTube videos into a Netflix-style interface.

**Disclaimer:** MyTube does not download, embed, or bypass any YouTube restrictions. It simply organizes links to your videos and opens them in your authenticated browser session.

## Features

- Netflix-style dashboard with horizontal scroll rows
- Hero banner for featured/trending videos
- Categories, collections, and tags for organization
- Search by title, tag, description, or category
- Filter by recently added, most watched, favorites, alphabetical
- Watch progress tracking (continue watching)
- Admin panel with full CRUD operations
- Import/Export videos as JSON
- Auto thumbnail retrieval from YouTube
- Dark theme (Netflix-inspired)
- Responsive (desktop, tablet, mobile)
- Keyboard shortcuts (Space, Left, Right, F, Esc, /)
- Docker Compose deployment

## Quick Start

### Prerequisites

- Docker
- Docker Compose

### Running

```bash
docker compose up -d
```

Access the app at `http://localhost`

### First Login

1. Open `http://localhost` in your browser
2. Click "Create Admin Account" on the login page
3. Default credentials: **admin / admin**
4. Change your password in Settings

## Manual Setup (without Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usage

### Adding Videos

1. Go to Admin panel (link in navbar)
2. Click "Add Video"
3. Paste a YouTube URL
4. Title, category, tags, and thumbnail are auto-filled
5. Save

### Watching Videos

- Click any video card to open the watch page
- Click "Open in Browser" to watch on YouTube in a new tab
- The app tracks your watch progress automatically

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Space` | Play/Pause (on watch page) |
| `Left` | Previous video |
| `Right` | Next video |
| `F` | Toggle favorite |
| `Esc` | Close modal / search |

## API Endpoints

### Auth
- `POST /api/auth/setup` - Create first admin account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `PUT /api/auth/change-password` - Change password

### Videos
- `GET /api/videos` - List videos (paginated, filterable)
- `GET /api/videos/dashboard` - Dashboard data
- `GET /api/videos/stats` - Statistics
- `GET /api/videos/:id` - Get video
- `POST /api/videos` - Create video
- `PUT /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video
- `PATCH /api/videos/:id/progress` - Update watch progress
- `POST /api/videos/import` - Import from JSON
- `GET /api/videos/export/json` - Export to JSON

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection
- `GET /api/collections/:id` - Get collection with videos
- `PUT /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection
- `POST /api/collections/:id/videos/:video_id` - Add video
- `DELETE /api/collections/:id/videos/:video_id` - Remove video

### Settings
- `GET /api/settings` - Get settings
- `POST /api/settings/backup` - Backup database
- `POST /api/settings/restore` - Restore database

## Project Structure

```
mytube/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── utils.py
│   │   └── routes/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   │── Dockerfile
│   └── nginx.conf
├── docker/
│   └── nginx/
│       └── default.conf
├── database/
├── docker-compose.yml
├── .env
└── README.md
```

## Future Roadmap

- TMDB integration for movie metadata
- Plex/Jellyfin library sync
- Local video file support
- Multiple users
- Electron desktop app
- Browser extension for one-click adding
