# Multi-stage build for Hermes backend
# NOTE: Requires web/dist to be pre-built on host (run `make web/build` first)
# This avoids building web assets twice and running out of memory in Docker

FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make

WORKDIR /build

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code (excluding items in .dockerignore)
COPY . .

# Verify web/dist exists (must be built on host before docker build)
RUN test -d web/dist || (echo "ERROR: web/dist not found! Run 'make web/build' first" && exit 1)

# Build the binary (with embedded web assets from host)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o hermes ./cmd/hermes

# Final stage - minimal runtime image
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates wget

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/hermes /app/hermes

# Copy configs (optional, can be mounted as volume)
COPY --from=builder /build/configs /app/configs

# Create non-root user
RUN adduser -D -u 1000 hermes && \
    chown -R hermes:hermes /app && \
    mkdir -p /app/workspace_data && \
    chown -R hermes:hermes /app/workspace_data

USER hermes

# Expose port
EXPOSE 8000

# Run the binary
ENTRYPOINT ["/app/hermes"]
CMD ["server"]
