# Deployment Guide

This document outlines the infrastructure and deployment configurations for hosting the Universal Watch Party platform.

---

## 1. Containerization
The backend service is containerized using Docker.

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## 2. Orchestration & Scaling
* **Kubernetes**: Deployed under a Kubernetes cluster with a `HorizontalPodAutoscaler` scaling pods based on CPU/Memory usage.
* **Ingress**: Nginx Ingress Controller configured to support WebSocket upgrades (`Connection: Upgrade` headers) and session affinity (sticky sessions) to map clients consistently during HTTP handshakes.
* **STUN/TURN Nodes**: Coturn instances deployed on dedicated virtual machines with open UDP ports `3478` and `443` to ensure NAT traversal rates exceed 95%.
