# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=user:user backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY --chown=user:user backend ./backend

# Copy root-level files
COPY --chown=user:user default.env ./.env
COPY --chown=user:user openenv.yaml .
COPY --chown=user:user inference.py .
COPY --chown=user:user pyproject.toml .
COPY --chown=user:user server ./server

# Copy built frontend from stage 1
COPY --chown=user:user --from=frontend-builder /app/frontend/dist ./frontend/dist

USER user

EXPOSE 7860

ENV HOST=0.0.0.0
ENV PORT=7860
ENV ENVIRONMENT=production
ENV PYTHONPATH=$HOME/app:$HOME/app/backend
ENV PYTHONUNBUFFERED=1

CMD ["python3", "server/app.py"]
