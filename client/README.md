# Client - Snackbar Kiosk Frontend

This directory will contain the React frontend application for the Snackbar Kiosk System.

## Structure

```
client/
├── src/           # Source code (to be implemented)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── dist/          # Build output (created by `npm run build`)
├── package.json   # Dependencies (to be created)
└── vite.config.js # Vite configuration (to be created)
```

## Development

The frontend will be implemented in future phases. For now, the platform foundation includes:

- Server-side API with authentication
- Nginx reverse proxy configuration
- Docker containerization

## Building

Once implemented:

```bash
npm install
npm run build
```

The built files in `dist/` will be served by Nginx.
