FROM node:20-slim

# Install system dependencies for node-canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Rebuild native modules for the current environment
RUN npm install && npm rebuild better-sqlite3

COPY . .
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

CMD ["npm", "start"]
