# --- build stage: build the client and install server deps ---
FROM node:20-slim AS build
WORKDIR /app

# native build tools for better-sqlite3 (falls back to prebuilt when available)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# client
COPY client/package*.json client/
RUN cd client && npm ci
COPY client client
RUN cd client && npm run build

# server
COPY server/package*.json server/
RUN cd server && npm ci --omit=dev
COPY server server

# --- runtime stage ---
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/data/app.db

COPY --from=build /app/server /app/server
COPY --from=build /app/client/dist /app/client/dist

# SQLite lives on a mounted volume so data survives restarts/redeploys
VOLUME /data
EXPOSE 4000
WORKDIR /app/server
CMD ["node", "src/index.js"]
