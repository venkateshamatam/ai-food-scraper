FROM node:18

# Install build tools and dependencies for compiling Python
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    libssl-dev \
    zlib1g-dev \
    libncurses5-dev \
    libncursesw5-dev \
    libreadline-dev \
    libsqlite3-dev \
    libgdbm-dev \
    libdb5.3-dev \
    libbz2-dev \
    libexpat1-dev \
    liblzma-dev \
    tk-dev

# Download and build Python 3.13.1 from source
RUN wget https://www.python.org/ftp/python/3.13.1/Python-3.13.1.tgz && \
    tar -xzf Python-3.13.1.tgz && \
    cd Python-3.13.1 && \
    ./configure --enable-optimizations && \
    make -j $(nproc) && \
    make altinstall && \
    cd .. && \
    rm -rf Python-3.13.1 Python-3.13.1.tgz && \
    ln -sf /usr/local/bin/python3.13 /usr/local/bin/python3 && \
    ln -sf /usr/local/bin/pip3.13 /usr/local/bin/pip3

# Upgrade pip and install required Python packages
RUN pip3 install --upgrade pip && pip3 install requests

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose your backend port (3000)
EXPOSE 3000

# Run database migrations then start the server
CMD ["sh", "-c", "npx knex migrate:latest && node server.js"]
