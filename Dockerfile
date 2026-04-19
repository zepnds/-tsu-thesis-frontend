# syntax=docker/dockerfile:1

# ---------- Builder stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (package.json & package-lock if present)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Backend API URL – can be overridden at build time
ARG VITE_API_URL=https://tsu-thesis-backend.onrender.com
ENV VITE_API_URL=${VITE_API_URL}
# Additional environment variables for the frontend
ARG VITE_API_BASE_URL=https://tsu-thesis-backend.onrender.com/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ARG VITE_API_BASE_URL_IMAGE=https://tsu-thesis-backend.onrender.com/api
ENV VITE_API_BASE_URL_IMAGE=${VITE_API_BASE_URL_IMAGE}
ARG VITE_EMAILJS_SERVICE_ID=service_ov1yoke
ENV VITE_EMAILJS_SERVICE_ID=${VITE_EMAILJS_SERVICE_ID}
ARG VITE_EMAILJS_TEMPLATE_ID=template_cditbww
ENV VITE_EMAILJS_TEMPLATE_ID=${VITE_EMAILJS_TEMPLATE_ID}
ARG VITE_EMAILJS_PUBLIC_KEY=2XT5Idrp-WO-7P5AX
ENV VITE_EMAILJS_PUBLIC_KEY=${VITE_EMAILJS_PUBLIC_KEY}
ARG VITE_GOOGLE_MAPS_API_KEY=AIzaSyBmf6xg-j_P_vGeVwYrb6wYOqzOfzIrm2A
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Build the production bundle
RUN npm run build

# ---------- Production stage (nginx) ----------
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional custom Nginx configuration (if you have nginx.conf in the project root)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;" ]
