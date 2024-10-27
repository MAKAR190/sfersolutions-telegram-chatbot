# Assuming you're using a Node.js image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps
# Copy the rest of your application
COPY . .

# Run your application (this may vary)
CMD ["node", "start"]
