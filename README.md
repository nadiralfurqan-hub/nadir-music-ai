# NADIR MUSIC AI — Kie.ai Suno integration starter

## Setup
1. Install Node.js 20+.
2. Extract this ZIP and open its folder in Terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Put your Kie.ai API key in `KIE_API_KEY` inside `.env`.
6. Run `npm start`, then open `http://localhost:3000`.

## Kie.ai settings
Defaults are configured for:
- Base URL: `https://api.kie.ai/api/v1`
- Create: `POST /generate`
- Status: `GET /generate/record-info?taskId=...`

Change `KIE_API_BASE_URL`, `KIE_CREATE_PATH`, `KIE_STATUS_PATH`, and `KIE_MODEL` in `.env` if the current documentation in your Kie.ai account specifies different values.

The create-task payload follows the Kie.ai Suno API pattern (`prompt`, `customMode`, `instrumental`, `model`, `title`, `style`, `vocalGender`, `lyrics`). Confirm exact model names, required fields, and response schema against your Kie.ai API documentation. If response fields differ, adjust `taskIdFrom` or `audioFrom` in `server.js`.

## Security and limitations
- Never put your API key in `public/` files, browser JavaScript, screenshots, or public Git repositories.
- This starter has a local browser Library, not a shared database.
- Login, payment, usage credits, persistent audio storage, production rate limiting, and cover upload are not implemented yet.
- Confirm Kie.ai pricing, rate limits, commercial-use rights, and current API compatibility before selling access.
