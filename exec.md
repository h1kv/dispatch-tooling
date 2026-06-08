# Execution

## Install dependencies

```bash
npm install
```

## Run the local development server

```bash
npm run dev
```

The server binds to `0.0.0.0` on port `3000`, so other devices on the same local network can connect with:

```text
http://<host-local-ip>:3000
```

The terminal output also prints detected local network URLs when the server starts.

## Build and run production preview

```bash
npm run build
npm run preview
```

Use the same local-network URL pattern:

```text
http://<host-local-ip>:3000
```
