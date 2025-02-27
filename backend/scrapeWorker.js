const { spawn } = require('child_process');
const knex = require('knex')(require('./knexfile').development);

const scrapeQueue = [];

const processQueue = async () => {
    if (scrapeQueue.length > 0) {
        const job = scrapeQueue.shift();
        const { vendor_id, menu_url } = job;
        console.log(`[scrapeWorker.js] Running scraper for vendor ID ${vendor_id}`);

        const scraperProcess = spawn('python3', ['fetch_meal_data.py', menu_url, 'meals_output.csv']);

        let pythonOutput = '';

        scraperProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
        });

        scraperProcess.stderr.on('data', (data) => {
            console.error(`[scrapeWorker.js] Scraper error: ${data.toString()}`);
        });

        scraperProcess.on('close', async (code) => {
            console.log(`[scrapeWorker.js] Scraper process exited with code ${code}`);
            console.log(`[scrapeWorker.js] Python script output: ${pythonOutput}`);

            let menuData;
            try {
                menuData = JSON.parse(pythonOutput);
            } catch (jsonError) {
                console.error(`[scrapeWorker.js] Failed to parse scraper response:`, jsonError);
                console.error(`[scrapeWorker.js] Raw scraper output:`, pythonOutput);
                return;
            }

            if (!Array.isArray(menuData) || menuData.length === 0) {
                console.error(`[scrapeWorker.js] Scraper ran but returned empty or invalid results`);
                console.error(`[scrapeWorker.js] Raw scraper output:`, pythonOutput);
                return;
            }

            console.log(`[scrapeWorker.js] Storing ${menuData.length} meals in the database...`);

            // Store meals in PostgreSQL
            await Promise.all(menuData.map(meal => {
                return knex('meals').insert({
                    vendor_id: vendor_id,
                    meal_name: meal.meal_name,
                    description: meal.description,
                    ingredients: meal.ingredients,
                    dietary_alignment: meal.dietary_alignment,
                    price: meal.price,
                    meal_photos: meal.meal_photos,
                }).onConflict(['vendor_id', 'meal_name']).ignore();
            }));

            console.log(`[scrapeWorker.js] Successfully stored meals for vendor ID ${vendor_id}`);
        });
    }
};

setInterval(processQueue, 5000); // Check the queue every 5 seconds

module.exports = {
    addJob: (job) => scrapeQueue.push(job)
};