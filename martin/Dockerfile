FROM ghcr.io/maplibre/martin:v0.15.0

# Copy configuration
COPY config.yaml /config.yaml

# Create directories for sprites and fonts
RUN mkdir -p /sprites /fonts

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["--config", "/config.yaml"]
