# Simple build for Hermes web frontend
# NOTE: Requires dist/ to be pre-built (run `yarn build` from web/ directory first)
# This avoids memory exhaustion during Docker build

FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy pre-built assets
COPY dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

# Expose port
EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]
