# Perplexity-style AI App (Backend + Frontend)

This repository contains a scaffold for an AI research assistant application styled similarly to Perplexity. It includes a Node.js/Express backend that routes to NVIDIA NIM models, integrates DuckDuckGo searches, provides SSE live status updates, and a React + Tailwind frontend UI.

Quick start (dev):

1. Copy `.env.example` to `.env` and fill in your NVIDIA NIM API keys.
2. Install backend dependencies:
   cd backend && npm install
3. Start backend:
   npm run dev
4. Install frontend dependencies:
   cd frontend && npm install
5. Start frontend:
   npm start

Notes:
- The NIM API endpoint used in nimClient is a best-effort placeholder; adjust according to NVIDIA's official docs.
- DuckDuckGo Instant Answer API is used for quick search results. Consider replacing with SERP APIs for richer results.
- Do not commit your API keys.
