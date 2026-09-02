FROM node:20-slim

# Install Python, FFmpeg, and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create symlink so 'python' command works
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install yt-dlp (used to download videos from a pasted YouTube URL)
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app

# Install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Python dependencies (scenedetect for clip detection)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY processor/ ./processor/

# Build TypeScript
RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/server.js"]
