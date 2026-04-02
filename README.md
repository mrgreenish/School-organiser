# School Organiser

All your Social Schools messages in one clear overview. Connects to Gmail to fetch and categorize Social Schools notifications with full privacy protection.

## Privacy

This app is designed with privacy as a core principle:

- **Client-side only**: All Gmail communication happens directly between your browser and Google's servers. No email data ever touches our server.
- **Filtered access**: Only emails from Social Schools senders are queried (`from:noreply@socialschools.eu`).
- **No storage**: Emails are not persisted anywhere. Close the tab and the data is gone.
- **Session-only tokens**: Gmail access tokens are stored in `sessionStorage` (cleared when the tab closes).
- **Open source**: Full source code is available for inspection.

## Features

- Automatic categorization of messages (events, payments, homework, newsletters, urgent, etc.)
- Important message highlighting
- Action item extraction (deadlines, amounts, to-dos)
- Date and event detection (Dutch + English)
- Category filtering
- Summary dashboard with counts

## Setup

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Create Google OAuth credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create an OAuth 2.0 Client ID (type: Web application)
   - Add authorized JavaScript origin: `http://localhost:3000`
   - Add authorized redirect URI: `http://localhost:3000/auth/callback`
   - Enable the [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Google Client ID
   ```

4. **Run:**
   ```bash
   npm run dev
   ```

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Google OAuth2 (implicit flow, client-side only)
- Gmail API (browser-direct)
