FROM alpine:3.21.5

# Update the package repository and install dependencies
RUN apk --no-cache update && \
    apk --no-cache upgrade

# Set the working directory
WORKDIR /app

# Copy the application binary and configuration
COPY hermes /app/hermes
COPY configs /app/configs

# Set the entrypoint to run the hermes application
ENTRYPOINT ["/app/hermes"]

# Default command when container starts
CMD ["server"]
