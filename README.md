# Unified Application

A backend application that combines transcript processing, style profiling, and content generation with AI voice interview capabilities.

## Overview

This application integrates:

1. **AI Voice Interviewer** - Conducts phone-based interviews using Vapi.ai
2. **Transcript Builder** - Processes interview transcripts into structured chunks
3. **Style Profiler** - Analyzes transcripts to extract stylistic elements
4. **Content Generator** - Creates website content, blogs, and social media posts

## Architecture

The application follows a modular architecture with these key components:

```
unified/
├── api/                      # Main API endpoints
│   ├── routes/               # REST API routes
│   └── webhooks/             # Webhook handlers for Vapi.ai
├── services/                 # Core functionality modules
│   ├── vapi/                 # Vapi.ai integration
│   ├── transcript/           # Transcript processing
│   ├── style/                # Style profiling
│   └── content/              # Content generation
├── models/                   # MongoDB models
├── utils/                    # Shared utilities
└── config/                   # Configuration files
```

## Data Flow

The application supports two entry points:

1. **Traditional Path**: Upload video/audio files → Process transcript → Generate content
2. **AI Voice Path**: Phone interview with Vapi.ai → Receive transcript → Process → Generate content

Both paths converge at the transcript processing stage and follow the same pipeline afterward.

## Prerequisites

- Node.js 18+
- MongoDB
- Python 3.10+ (for transcript and style processing)
- Vapi.ai account and API key
- OpenAI API key

## Environment Variables

Create a `.env` file with the following variables:

```
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# OpenAI API Key (for GPT-4)
OPENAI_API_KEY=your_openai_api_key

# Vapi.ai Configuration
VAPI_API_KEY=your_vapi_api_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id
VAPI_PHONE_NUMBER=your_vapi_phone_number

# Server Configuration
PORT=3000
NODE_ENV=development

# Base URL for webhooks
BASE_URL=https://your-app-url.com
```

## Installation

1. Clone the repository
2. Install Node.js dependencies:

```bash
npm install
```

3. Install Python dependencies:

```bash
pip install openai requests python-dotenv
```

## Usage

### Starting the Server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

### API Endpoints

#### Interviews

- `GET /api/interviews` - List all interviews
- `GET /api/interviews/:id` - Get interview details
- `POST /api/interviews` - Create a new interview
- `PUT /api/interviews/:id` - Update an interview
- `DELETE /api/interviews/:id` - Delete an interview
- `POST /api/interviews/:id/call` - Initiate a Vapi call

#### Transcripts

- `GET /api/transcripts` - List all transcripts
- `GET /api/transcripts/:id` - Get transcript details
- `POST /api/transcripts/upload` - Upload and process files
- `GET /api/transcripts/:id/chunks` - Get transcript chunks
- `GET /api/transcripts/:id/status` - Get processing status
- `DELETE /api/transcripts/:id` - Delete a transcript

#### Style Profiles

- `GET /api/profiles` - List all profiles
- `GET /api/profiles/:id` - Get profile details
- `POST /api/profiles/generate` - Generate from transcript
- `GET /api/profiles/:id/status` - Get generation status
- `DELETE /api/profiles/:id` - Delete a profile

#### Content

- `GET /api/content` - List all content
- `GET /api/content/:id` - Get content details
- `POST /api/content/generate` - Generate from profile
- `GET /api/content/:id/status` - Get generation status
- `PUT /api/content/:id/fields` - Update content fields
- `POST /api/content/:id/approve` - Approve content
- `DELETE /api/content/:id` - Delete content

### Webhooks

- `POST /webhooks/vapi/call-completed` - Receive Vapi call completion
- `POST /webhooks/vapi/call-status` - Receive Vapi call status updates

## Development

### Project Structure

- `server.js` - Application entry point
- `api/routes/*.js` - API route handlers
- `api/webhooks/*.js` - Webhook handlers
- `services/*/` - Core service modules
- `models/*.js` - MongoDB schemas
- `utils/` - Shared utility functions
- `config/` - Configuration files

## License

Proprietary
