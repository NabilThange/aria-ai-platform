# Base image
FROM node:20-alpine

# Declare build arguments
ARG ARIA_AGENT_BASE_URL
ARG ARIA_DESKTOP_VNC_URL

# Set environment variables for the build process
ENV ARIA_AGENT_BASE_URL=${ARIA_AGENT_BASE_URL}
ENV ARIA_DESKTOP_VNC_URL=${ARIA_DESKTOP_VNC_URL}

# Create app directory
WORKDIR /app

# Copy app source
COPY ./shared ./shared
COPY ./aria-ui/ ./aria-ui

WORKDIR /app/aria-ui

# Install dependencies
RUN npm install

RUN npm run build

# Run the application
CMD ["npm", "run", "start"] 


