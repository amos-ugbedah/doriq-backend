FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the port
EXPOSE 7860

# Start your backend server
CMD ["node", "src/server.js"]
