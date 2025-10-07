# Development build for Hermes web frontend with built-in proxy
# Uses Ember's development server which can proxy API requests to the backend

FROM node:20-alpine

WORKDIR /app

# Enable Corepack for Yarn 4 support
RUN corepack enable

# Copy package files for dependency installation
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies
RUN yarn install --immutable

# Copy application source
COPY . .

# Expose port
EXPOSE 4200

# Start Ember development server with proxy to backend
# The proxy URL is passed via HERMES_API_URL environment variable
CMD ["sh", "-c", "yarn ember server --proxy ${HERMES_API_URL:-http://hermes:8000} --port 4200 --host 0.0.0.0"]
