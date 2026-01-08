FROM node:20-alpine

WORKDIR /app

# Install dependencies combined with system dependencies for potential native modules
# openssl is required for Prisma Client
RUN apk add --no-cache openssl

COPY package*.json ./
# Install all dependencies including devDependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 5000

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Start command (passed to entrypoint)
CMD ["npm", "start"]
