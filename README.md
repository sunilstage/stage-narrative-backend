# 🎬 STAGE Narrative Engine - Backend

AI-powered marketing narrative generation system for Hindi/Hinglish OTT content.

## 🚀 Features

- **AI Story Architect** - Analyzes content and extracts conflicts
- **Production Council** - 6 AI personas brainstorm narratives collaboratively
- **Audience Council** - 8 AI personas evaluate from viewer perspective
- **Dual Rounds** - Pure AI + AI + Human feedback
- **Comprehensive Scoring** - Production + Audience ratings

## 🛠️ Tech Stack

- **Framework:** NestJS 10
- **Database:** MongoDB (Mongoose)
- **AI:** Anthropic Claude Sonnet 4.5
- **Language:** TypeScript
- **API Docs:** Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Anthropic API key

## 🔧 Installation

### 1. Clone the repository

```bash
git clone https://github.com/sunilstage/stage-narrative-backend.git
cd stage-narrative-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/narrative_engine?retryWrites=true&w=majority

# Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Server port
PORT=8000
NODE_ENV=development
```

### 4. Run the application

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run build
npm run start:prod
```

## 📡 API Endpoints

### Content Management

- `POST /api/narrative/content` - Create content
- `GET /api/narrative/content` - List all content
- `GET /api/narrative/content/:id` - Get single content
- `PUT /api/narrative/content/:id` - Update content
- `DELETE /api/narrative/content/:id` - Delete content

### Narrative Generation

- `POST /api/narrative/content/:id/generate` - Generate narratives (3-5 min)
- `GET /api/narrative/content/:id/sessions` - Get all sessions
- `GET /api/narrative/content/:id/sessions/:sessionId` - Get session details

### Documentation

- `GET /api/docs` - Swagger UI

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API key | ✅ |
| `PORT` | Server port (default: 8000) | ❌ |
| `NODE_ENV` | Environment (development/production) | ❌ |

## 🏗️ Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
└── narrative/
    ├── controllers/       # API endpoints
    ├── services/          # Business logic
    ├── schemas/           # Mongoose models
    ├── dto/              # Data transfer objects
    └── constants/        # AI personas & prompts
```

## 🚀 Deployment

### Railway (Recommended)

1. Fork this repository
2. Connect to Railway
3. Add environment variables
4. Deploy automatically

### Render

1. Create new Web Service
2. Connect repository
3. Build Command: `npm install && npm run build`
4. Start Command: `npm run start:prod`
5. Add environment variables

### Heroku

```bash
heroku create stage-narrative-backend
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set ANTHROPIC_API_KEY=your_api_key
git push heroku main
```

## 📊 Database Schema

### NarrativeContent
- Content metadata (title, genre, runtime, etc.)
- Story Architect analysis
- Stakeholder responses

### NarrativeSession
- Generation session tracking
- Council conversation logs
- Round information

### NarrativeCandidate
- Generated narratives
- Production council evaluations
- Audience council evaluations
- Overall scores and rankings

## 🤖 AI Personas

### Production Council (6)
1. Content Head - Strategic oversight
2. Creative Director - Artistic vision
3. Marketing Head - Market positioning
4. Social Media Manager - Viral potential
5. Distribution Head - Platform strategy
6. Brand Strategist - Long-term value

### Audience Council (8)
- Urban Youth, Young Parents, Film Enthusiasts, etc.

## ⚠️ Important Notes

- **Synchronous Generation:** Without Redis, generation is blocking (3-5 minutes)
- **Production Ready:** For production, add Redis for async processing
- **CORS:** Configure allowed origins in production
- **Rate Limiting:** Consider adding for production use

## 📝 API Example

### Generate Narratives

```bash
curl -X POST http://localhost:8000/api/narrative/content/{id}/generate \
  -H "Content-Type: application/json" \
  -d '{
    "round": 1
  }'
```

Response:
```json
{
  "sessionId": "507f1f77bcf86cd799439011",
  "status": "completed",
  "message": "Narrative generation completed successfully."
}
```

### Get Session Results

```bash
curl http://localhost:8000/api/narrative/content/{id}/sessions/{sessionId}
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Documentation

- **API Docs:** http://localhost:8000/api/docs (when running)
- **Architecture:** See main repo documentation
- **Personas:** Detailed in `/src/narrative/constants/prompts.config.ts`

## 🤝 Contributing

This is part of the STAGE Narrative Engine project. For the complete system including frontend, see:
- Frontend: https://github.com/sunilstage/stage-narrative-frontend
- Main Repo: https://github.com/sunilstage/stage-narrative-engine

## 📄 License

MIT

## 🔗 Links

- **Frontend Repo:** https://github.com/sunilstage/stage-narrative-frontend
- **API Docs:** Swagger UI at `/api/docs`
- **Anthropic Docs:** https://docs.anthropic.com/

---

**Built with ❤️ for STAGE OTT Platform**
