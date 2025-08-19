# Use an official Node.js runtime as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy Prisma schema first (needed for prisma generate)
COPY prisma ./prisma/

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (this will trigger prisma generate)
RUN npm install

# Manually run prisma generate again (optional but safe)
RUN npx prisma generate

# Copy the rest of the app
COPY src ./src/
COPY tsconfig*.json ./

# Build the app
RUN npm run build

# Expose the app port
EXPOSE 8080

# Run Prisma migration and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
