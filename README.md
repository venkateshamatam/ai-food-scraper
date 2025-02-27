
# AI-Powered Food Intelligence & Data Processing

This project automates the extraction, enrichment, and presentation of restaurant menu data at scale. The system is designed to:


- **Extract and process restaurant menu details** using FetchFox, retrieving meal descriptions, prices, and vendor-related metadata.

- **Handle scraping tasks asynchronously** through a queue-based system, allowing for non-blocking API interactions and better scalability.

- **Enhance vendor information** by aggregating third-party review sources, social media links, and dynamically generating vendor descriptions from extracted data.

- **Store and serve structured data efficiently** via a backend built with Node.js and Koa, using PostgreSQL for persistence.

- **Deliver an intuitive frontend experience** with a React Native UI that ensures smooth navigation and data presentation.

The goal is to develop a **scalable and intelligent data pipeline** that minimizes manual intervention while adapting seamlessly to new vendors.

## Tech Stack

This project is built using technologies that ensure efficiency, scalability, and maintainability.

### **Backend**

- **Node.js & Koa** – Lightweight and efficient framework for building RESTful APIs.

- **Knex.js** – SQL query builder for structuring and managing database interactions.

- **PostgreSQL** – Chosen for its reliability and ability to handle complex data relationships.

  

### **Web Scraping**

- **FetchFox** – AI-powered web scraper that extracts structured data from websites.

  

### **Frontend**

- **React Native** – Cross-platform framework for building a performant and responsive UI.

  

### **Infrastructure & Deployment**

- **Docker** – Used for containerizing the application and simplifying deployment.

- **Cron Jobs** – Automates scheduled scraping runs to ensure vendor data remains up to date.

  
  

## Architecture & Design Approach

  

This system is designed to efficiently extract, process, and serve restaurant menu data while ensuring scalability and responsiveness. The key architectural components include:

  

### **1. Scraping System**

- **AI-Powered Extraction** – FetchFox is used to extract structured restaurant data, including menu items, prices, and metadata.

- **Vendor & Meal Data Extraction** – Two scripts handle scraping:

- `fetch_vendor_data.py` – Runs for the first time when a vendor is added to extract general vendor metadata.

- `fetch_meal_data.py` – Runs everytime menu data is needed. It runs automatically for the first time, and has to be force triggered either manually or through a cronjob from the second time.

  

- **On-Demand Scraping API** – A `/vendors/{id}/scrape` endpoint allows for forced scraping, enabling scheduled updates via cron jobs.

  

### **2. Caching Mechanism**

- **Eliminates Redundant Scraping** – Before triggering a new scraping job, the system checks if the data already exists in the database. If available, the API serves it directly from the database instead of re-running the scraping scripts.

- **Optimized for Performance** – When a vendor is added for the first time, scraping runs and stores the data persistently. Subsequent requests retrieve pre-existing data, reducing API response time and improving efficiency.

  

### **3. Asynchronous Scraping Queue**

- **Queue-Based Processing** – Scraping tasks are added to a queue (`scrapeQueue`) instead of being executed immediately to prevent API delays. Tasks are processed in a first-in, first-out order to maintain fairness and consistency.

- **Non-Blocking API Response** – The API returns `202 Accepted`, allowing users to continue using the app while scraping happens in the background.

  

### **4. Database & Data Model**

- **Normalized Relational Storage** – PostgreSQL is used to maintain structured vendor and menu data.

- **Flexible Metadata Storage** – `JSONB` is used for `review_links`, allowing for easy expansion of additional metadata without altering the schema.

- **Automated Status Checks** – A cron job can be scheduled that validates vendor URLs (`menu_url`, `website`) and update the `status_code` field to detect broken links.

  

### **5. API Structure**

- **Node.js & Koa-Based REST APIs** – The backend exposes APIs to manage vendors, meals, and scraping operations.

- **Efficient Querying with Knex.js** – The database interactions are optimized for performance and scalability.

  

### **6. Frontend & User Experience**

- **React Native-Based UI** – A mobile-friendly frontend for browsing vendor menus seamlessly.

- **Dynamic Updates** – The UI fetches the latest API responses in real-time, ensuring up-to-date menu data without requiring manual refresh.

- **User Feedback Mechanism** – Displays a loading indicator when fetching data and a message prompting users to check back when new data is being scraped.

  
  

## API Endpoints & Functionality

  

The backend provides a set of RESTful APIs built to manage vendors, meals, and scraping operations.

  

### **1. Vendor Management**

#### `GET /vendors`

Retrieves a list of all vendors along with their metadata, including names, websites, and social links.

  

#### `POST /vendors`

Adds a new vendor to the database. When a vendor is added, an initial scraping job runs to fetch vendor details and menu items.

  

#### `GET /vendors/{id}`

Fetches detailed information about a specific vendor, including its menu URL, description, and associated metadata.

  

#### `DELETE /vendors/{id}`

Removes a vendor from the database, along with all associated menu items.

  
  

### **2. Menu Management**

#### `GET /vendors/{id}/meals`

Retrieves all meals for a given vendor. If menu data is already cached, it is served directly from the database.

  

#### `GET /meals`

Fetches all meals across multiple vendors, providing an aggregated view of menu items.

  

#### `DELETE /meals/{id}`

Deletes a specific meal from the database.

  
  

### **3. Scraping Operations**

#### `POST /vendors/{id}/scrape`

Forces a fresh scrape of a vendor's menu. This adds a job to the **scrapeQueue** and responds with `202 Accepted`, indicating that the scraping is running asynchronously.

  
  

### **Key API Behaviors**

- **Caching Strategy** – If vendor or meal data is already available in the database, the API serves it directly instead of re-running the scraper.

- **Efficient Data Management** – When a vendor is deleted, all its associated meals are also removed to maintain data integrity.

- **Error Handling** – APIs return appropriate HTTP status codes (`404` for missing resources, `400` for bad requests.. etc.).

  
  
  

## Database Schema & Data Model

  

The system uses a **relational database (PostgreSQL)** to store vendor and menu data. The schema consists of two main tables: `vendors` and `meals`.

### **Vendors Table**

Stores information about restaurants, their metadata, and review links.

| Column               | Type      | Constraints                             |
|----------------------|-----------|-----------------------------------------|
| `id`                 | Integer   | Primary Key, Auto-Increment             |
| `vendor_name`        | String    | Unique, Not Null                        |
| `menu_url`           | String    | Not Null                                |
| `website`            | String    | -                                       |
| `instagram`          | String    | -                                       |
| `google_maps`        | String    | -                                       |
| `review_links`       | JSONB     | Default `{}`                            |
| `vendor_description` | Text      | -                                       |
| `vendor_logo`        | String    | -                                       |
| `status_code`        | Integer   | Default `404`                           |
| `last_updated`       | Timestamp | Default `NOW()`                         |

---

### **Meals Table**

Stores individual meal items associated with a vendor.

| Column                         | Type      | Constraints                                           |
|--------------------------------|-----------|-------------------------------------------------------|
| `id`                           | Integer   | Primary Key, Auto-Increment                           |
| `vendor_id`                    | Integer   | Foreign Key (`vendors.id`), On Delete Cascade         |
| `meal_name`                    | String    | Not Null                                              |
| `ingredients`                  | Text      | -                                                     |
| `dietary_alignment`            | String    | -                                                     |
| `price`                        | String    | -                                                     |
| `meal_photos`                  | String    | -                                                     |
| `url`                          | String    | -                                                     |
| `UNIQUE(vendor_id, meal_name)` | Constraint| Ensures a vendor cannot have duplicate meal names     |
  

### **Schema Notes**

- `review_links` is stored as **JSONB** to allow structured and dynamic storage of third-party review URLs.

- `ON DELETE CASCADE` ensures that when a vendor is removed, all associated meals are deleted automatically.

- The **unique constraint on (`vendor_id`, `meal_name`)** prevents duplicate entries for the same restaurant.

  

## Future Optimizations

  

There are multiple areas where the system can be enhanced to improve scalability, performance, and user experience.

  

### **1. Polling for Scraping Progress**

- Instead of asking users to check back later, implement **automatic polling** to update the UI when a scrape job is completed.

- The frontend can periodically check the API for scrape status and display progress indicators.

  

### **2. Improved Error Handling & Retries**

- Add **automatic retries** for failed scraping jobs, especially for transient issues like network failures.

- Implement a **logging and alerting mechanism** to notify admins when a scraping job repeatedly fails.

  

### **3. More Efficient Scraping Queue Management**

- Introduce **concurrent processing** for scraping jobs instead of strictly FIFO execution.

- Implement **rate limiting and backoff strategies** to prevent hitting website restrictions.

  

### **4. Better Data Freshness & Update Handling**

- Introduce a mechanism to **detect menu changes** automatically instead of relying on scheduled scrapes.

- Implement **partial updates** instead of scraping the entire menu each time.

  

### **5. Optimized Database Queries & Indexing**

- Add **database indexing** on frequently queried fields to improve API response times.

- Optimize `JOIN` operations when retrieving vendor and meal data.

  

### **6. Enhanced UI Features**

- Add **search and filtering** options for users to quickly find vendors or meals based on cuisine, dietary preferences, or price range.

- Improve accessibility by ensuring better color contrast and screen reader support.
  

## Setup & Deployment

  

### Prerequisites (Versions Used)

- **Node.js**: v23.6.0

- **npm**: v10.9.2

- **Python**: v3.13.1

- **PostgreSQL**: v14.13

  
### Setup using Docker (Make sure you have Docker Compose Installed)

#### Step 1: Clone the Repository

```bash

git clone https://github.com/venkateshamatam/ai-food-scraper.git

cd ai-food-scraper

```

#### Step 2: Update the `docker-compose.yml` file with your Fetch Fox API key

Get a fetchfox API key from fetchfox.ai and update it in the `docker-compose.yml` file that's present in the root directory. 

Once you're dong updating it - run the below command:

```bash
docker-compose up --build
docker ps # to check if all containers are running
```


- The API Server will be running on localhost:3000 and the swagger API docs on localhost:3000/docs. The UI will be on localhost:8081. 


### Manual Setup

#### Step 1: Clone the Repository

```bash

git clone https://github.com/venkateshamatam/ai-food-scraper.git

cd ai-food-scraper

```

#### Step 2: Backend Setup

Enter the backend directory and create your environment file:

```bash

cd backend

touch .env

```

You can connect the application to PostgreSQL in one of two ways:


#### Option 1: Using a Testing PostgreSQL Database (via Docker)

1. **Launch the Testing Database:**

Start a PostgreSQL container by running:

```bash

docker run --name postgres -e POSTGRES_PASSWORD=ilovepostgres -d -p 5432:5432 postgres

```

2. **Configure Environment Variables:**

In your `.env` file, add:

```

FETCH_FOX_API_KEY={your_fetch_fox_api_key}

```

3. **Install and Run:**

Install dependencies, apply migrations, and start the server:

```bash

npm i

npx knex migrate:latest

node server.js

```

  

#### Option 2: Using Your Own PostgreSQL Database

1. **Configure Environment Variables:**

In your `.env` file, add your database credentials along with the API key:

```

DB_HOST={your host}

DB_USER={your user}

DB_PASSWORD={your pass}

DB_NAME={your db name}

DB_PORT={your db port}

FETCH_FOX_API_KEY={your api key}

```

2. **Install and Run:**

Then, install dependencies, run migrations, and start the server:

```bash

npm i

npx knex migrate:latest

node server.js

```

>  **Important:** If you don't see the "Database Connection Succeeded" log within a few seconds of server startup, the connection likely failed and will eventually time out.

- The server will be running on localhost:3000 and the swagger API docs on localhost:3000/docs

### Step 3: Frontend Setup

Open a new terminal and run:

```bash

cd frontend

npm install

npm run web

```

- Open localhost:8081 on your browser in **mobile mode** for an app-like experience.

- To run on **Android or iOS**, you might want to have **Android Studio** or **Xcode** installed.


## Troubleshooting

- Make sure PostgreSQL is running before starting the backend.

- If you encounter missing dependencies, reinstall them:

```bash

npm install

```
