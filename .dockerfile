# Use the official Node.js image.
FROM node:18

# Set the working directory.
WORKDIR /app

# Copy package.json and package-lock.json.
COPY package*.json ./

# Install dependencies with legacy peer deps.
RUN npm install --legacy-peer-deps

# Copy the rest of your application files.
COPY . .

# Expose the port your app runs on.
EXPOSE 3000

# Start the application.
CMD ["npm", "start"]
