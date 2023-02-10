# syntax = docker/dockerfile:1.4

# BUILD FRONTEND STAGE
FROM node:16-alpine as frontend-builder
WORKDIR /app

# Install Make
RUN apk add --no-cache make

# Install Yarn v3
RUN corepack enable
RUN corepack prepare yarn@stable --activate
RUN yarn set version stable

# Copy and install deps
COPY --link Makefile .
COPY --link web web
RUN make web/install-deps

# Copy all file
COPY --link . .

# Build frontend
RUN make web/build

# BUILD BACKEND STAGE
FROM golang:1.18 as backend-builder
WORKDIR /app
COPY --link go.mod go.sum ./
RUN go mod download
COPY --link . .
COPY --link --from=frontend-builder /app/web/dist /app/web/dist
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
