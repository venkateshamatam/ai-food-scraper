FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose your frontend port (e.g., 3000)
EXPOSE 8081

# Start the frontend service
CMD ["npm", "run", "web"]
