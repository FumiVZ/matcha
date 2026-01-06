FROM node:20-alpine

WORKDIR /app

# Install dependencies for bcrypt
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/photos

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
