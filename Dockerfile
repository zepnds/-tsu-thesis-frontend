# syntax=docker/dockerfile:1

# --- Stage 1: Build Stage ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --quiet

# Copy the rest of the application code
COPY . .

# Build Arguments for Environment Variables
# Using relative paths (/api) ensures we satisfy CSP and use the Nginx proxy
ARG VITE_API_BASE_URL=/api
ARG VITE_API_BASE_URL_IMAGE=/api
ARG VITE_EMAILJS_SERVICE_ID=service_ov1yoke
ARG VITE_EMAILJS_TEMPLATE_ID=template_cditbww
ARG VITE_EMAILJS_PUBLIC_KEY=2XT5Idrp-WO-7P5AX
ARG VITE_GOOGLE_MAPS_API_KEY=AIzaSyBmf6xg-j_P_vGeVwYrb6wYOqzOfzIrm2A

# Set them as ENV
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_BASE_URL_IMAGE=$VITE_API_BASE_URL_IMAGE
ENV VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID
ENV VITE_EMAILJS_TEMPLATE_ID=$VITE_EMAILJS_TEMPLATE_ID
ENV VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Perform the production build
RUN npm run build

# --- Stage 2: Serving Stage ---
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
