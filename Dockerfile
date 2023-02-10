# BUILD FRONTEND STAGE
FROM node:18-alpine as frontend-builder
WORKDIR /app

# Copy all file
COPY . .

# Install Make
RUN apk add --no-cache make

# Install Yarn v3
RUN corepack enable
RUN corepack prepare yarn@stable --activate
RUN yarn set version stable

# Build frontend
RUN make web/build

# BUILD BACKEND STAGE
FROM golang:1.18 as backend-builder
WORKDIR /app
COPY --from=frontend-builder /app/web/dist /app/web/dist
COPY . .
RUN make bin

# RUN STAGE
FROM alpine:latest

# Copy execute file
WORKDIR /app
COPY --from=backend-builder /app/hermes hermes

# Set execuateable
RUN chmod +x hermes

# Execute app
ENTRYPOINT ["./hermes"]