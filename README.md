# Aven Support Bot

A conversational AI assistant for Aven financial services, featuring voice interaction capabilities and appointment scheduling.

## Project Structure

```
.
├── backend/
│   ├── data_ingestion_pipeline/ # Data ingestion from Aven website
│   └── RAG/                     # Retrieval Augmented Generation system
└── frontend/                    # Next.js web application
```

## Features

- Voice-enabled AI assistant for Aven customer support
- Real-time audio visualization 
- RAG (Retrieval Augmented Generation) for accurate responses
- Appointment scheduling system
- User feedback collection

## Prerequisites

- Python 3.8+
- Node.js 18+
- Redis database (Upstash)
- Google AI API key
- Pinecone vector database
- VAPI.ai API key

## Setup

### Backend

1. Create and activate a Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:
```bash
cd RAG
pip install -r requirements.txt
```

3. Set up environment variables in `.env`:
```
GOOGLE_API_KEY=your_google_ai_api_key
PINECONE_API_KEY=your_pinecone_api_key
VAPI_API_KEY=your_vapi_api_key
```

4. Run the Flask server:
```bash
python RAG/rag.py
```

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set up environment variables in `.env.local`:
```
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000/rag
NEXT_PUBLIC_VAPI_API_KEY=your_vapi_api_key
NEXT_PUBLIC_HUMEAI_API_KEY=your_humeai_api_key
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Data Ingestion

To update the knowledge base with fresh content from Aven's website:

```bash
cd backend/data_ingestion_pipeline
python firecrawlExtraction.py
```

## Testing

Run frontend tests:
```bash
cd frontend
npm test
```

## Environment Variables

### Backend
- `GOOGLE_API_KEY`: Google AI API key for Gemini model
- `PINECONE_API_KEY`: Pinecone vector database API key
- `VAPI_API_KEY`: VAPI.ai API key for voice processing

### Frontend
- `NEXT_PUBLIC_FLASK_API_URL`: Backend API endpoint
- `NEXT_PUBLIC_VAPI_API_KEY`: VAPI.ai API key
- `NEXT_PUBLIC_HUMEAI_API_KEY`: Hume AI API key
- `UPSTASH_REDIS_REST_URL`: Redis database URL
- `UPSTASH_REDIS_REST_TOKEN`: Redis authentication token

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Backend: Python, Flask
- AI: Google Gemini, VAPI.ai
- Vector DB: Pinecone
- Cache: Upstash Redis
- Audio Processing: Web Audio API, VAPI.ai

## System Architecture

### Overview
The Aven Support Bot uses a microservices architecture with the following key components:

```
┌────────────────┐         ┌────────────────┐         ┌─────────────────┐
│    Frontend    │         │    Backend     │         │   External APIs  │
│  (Next.js App) │◄───────►│  (Flask API)   │◄────────►│& Cloud Services │
└────────────────┘         └────────────────┘         └─────────────────┘
```

### Data Flow

1. **Voice Input Processing**
   - User speech is captured via browser's Web Audio API
   - VAPI.ai handles real-time voice-to-text conversion
   - Audio visualization provides user feedback

2. **Query Processing**
   - Text queries are processed by the RAG system
   - Steps:
     1. Query embedding generation
     2. Vector similarity search in Pinecone
     3. Context retrieval and augmentation
     4. Response generation using Google Gemini

3. **Appointment System**
   - User requests are validated against business rules
   - Appointments are stored in Upstash Redis
   - Real-time availability checks and confirmations

### Components Breakdown

#### Frontend Layer
- React components for UI
- WebSocket connections for real-time audio
- State management for conversation flow
- Responsive design for multiple devices

#### Backend Layer
- Flask REST API endpoints
- RAG implementation using:
  - Embedding models
  - Vector database operations
  - Context processing
- Data ingestion pipeline for knowledge base updates

#### Data Storage
- Pinecone: Vector embeddings for RAG
- Upstash Redis: 
  - Session management
  - Appointment data
  - Caching layer

#### External Services
- Google Gemini: LLM for response generation
- VAPI.ai: Voice processing
- Hume AI: Emotion analysis
- Upstash: Distributed caching

### Security Measures
- API key rotation
- Rate limiting
- Input validation
- Secure WebSocket connections
- Environment variable protection

## Backend Architecture

### RAG System Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Query    │     │Query Embeddings  │     │    Pinecone    │
│  Processing     │────►│   Generation    │────►│  Vector Search  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
┌─────────────────┐     ┌─────────────────┐           ▼
│  Final Response │     │ Google Gemini   │     ┌─────────────────┐
│  to User       │◄────│    LLM          │◄────│Context Retrieval │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Data Ingestion Pipeline
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Web Crawler    │     │  Text Chunking  │     │   Embedding     │
│  (Firecrawl)   │────► │  & Processing   │────►│   Generation    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                       ▼
                                               ┌─────────────────┐
                                               │    Pinecone     │
                                               │Vector Database  │
                                               └─────────────────┘
```

### Backend Components Detail

1. **RAG (Retrieval Augmented Generation) System**
   - **Query Processing**: Handles incoming user queries (text/voice)
   - **Embedding Generation**: Creates vector embeddings of queries
   - **Vector Search**: Searches Pinecone for relevant context
   - **Context Retrieval**: Gets and processes matching documents
   - **LLM Integration**: Sends context+query to Google Gemini
   - **Response Generation**: Formats and returns AI response

2. **Data Ingestion Pipeline**
   - **Web Crawler**: 
     - Uses Firecrawl to extract Aven website content
     - Maintains content structure and metadata
   - **Text Processing**:
     - Chunks content into optimal sizes
     - Removes irrelevant content and noise
     - Maintains semantic coherence
   - **Embedding System**:
     - Generates embeddings for each chunk
     - Optimizes for semantic search
     - Handles batch processing
   - **Storage Management**:
     - Efficient vector storage in Pinecone
     - Maintains version control of content
     - Handles updates and deletions

3. **Integration Points**
   - Flask API endpoints for query handling
   - WebSocket connections for real-time responses
   - Redis caching for improved performance
   - Security middleware for request validation