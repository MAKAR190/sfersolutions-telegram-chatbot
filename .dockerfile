# Use the official Node.js image from the Docker Hub
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies with legacy peer dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (adjust as necessary)
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]
