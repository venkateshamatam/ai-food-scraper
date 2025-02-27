const Koa = require('koa');
const Router = require('koa-router');
const knex = require('knex')(require('./knexfile').development);
const { execSync } = require('child_process');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('koa2-swagger-ui');
const cors = require("@koa/cors");

const scrapeQueue = [];
const app = new Koa();
const router = new Router();
const bodyParser = require('koa-bodyparser');
app.use(bodyParser());
const axios = require('axios');
const { addJob } = require('./scrapeWorker'); // Import the scrapeWorker

app.use(cors());

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Parkday API',
            version: '1.0.0',
            description: 'Vendor Menu Scraper API',
        },
        servers: [{ url: "http://localhost:3000" }]
    },
    apis: ["./server.js"],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use(swaggerUi.koaSwagger({ routePrefix: '/docs', swaggerOptions: { spec: swaggerDocs } }));


console.log("[server.js] Server starting...");

async function checkDatabaseConnection() {
    try {
        await knex.raw('SELECT 1+1 AS result');
        console.log("[server.js] Database connection successful");
    } catch (error) {
        console.error("[server.js] Database connection error:", error);
        process.exit(1); // Exit the process with an error code
    }
}

// Check the database connection when the server starts
checkDatabaseConnection();

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Fetches a list of all available vendors with metadata.
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   vendor_name:
 *                     type: string
 *                   menu_url:
 *                     type: string
 *                   vendor_description:
 *                     type: string
 *                   website:
 *                     type: string
 *                   social_links:
 *                     type: object
 *                     properties:
 *                       instagram:
 *                         type: string
 *                       google_maps:
 *                         type: string
 *                   review_links:
 *                     type: object
 *                     properties:
 *                       infatuation:
 *                         type: string
 *                       eater:
 *                         type: string
 *                   status_code:
 *                     type: integer
 *                   last_updated:
 *                     type: string
 *                     format: date-time
 */

router.get('/vendors', async (ctx) => {
    console.log("[server.js] Fetching all vendors...");

    try {
        const vendors = await knex('vendors').select('*');

        // Transform data to match the expected response structure
        ctx.body = vendors.map(vendor => ({
            id: vendor.id,
            vendor_name: vendor.vendor_name,
            menu_url: vendor.menu_url,
            vendor_description: vendor.vendor_description,
            website: vendor.website,
			vendor_logo: vendor.vendor_logo,  
            social_links: {
                instagram: vendor.instagram,
                google_maps: vendor.google_maps
            },
            review_links: typeof vendor.review_links === 'string' ? JSON.parse(vendor.review_links) : vendor.review_links, // ✅ Fixed!
            status_code: vendor.status_code,
            last_updated: vendor.last_updated
        }));
    } catch (error) {
        console.error("[server.js] Error fetching vendors:", error);
        ctx.status = 500;
        ctx.body = { error: "Internal server error" };
    }
});

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get vendor details
 *     description: Retrieves detailed vendor information from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor
 *     responses:
 *       200:
 *         description: Vendor details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 vendor_name:
 *                   type: string
 *                 menu_url:
 *                   type: string
 *                 vendor_description:
 *                   type: string
 *                 website:
 *                   type: string
 *                 social_links:
 *                   type: object
 *                   properties:
 *                     instagram:
 *                       type: string
 *                     google_maps:
 *                       type: string
 *                 review_links:
 *                   type: object
 *                   properties:
 *                     infatuation:
 *                       type: string
 *                     eater:
 *                       type: string
 *                 status_code:
 *                   type: integer
 *                 last_updated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Vendor not found
 */

router.get('/vendors/:id', async (ctx) => {
    console.log(`[server.js] Fetching vendor details for ID ${ctx.params.id}`);

    try {
        const vendor = await knex('vendors').where({ id: ctx.params.id }).first();

        if (!vendor) {
            console.error(`[server.js] Vendor ID ${ctx.params.id} not found`);
            ctx.status = 404;
            ctx.body = { error: 'Vendor not found' };
            return;
        }

        // ✅ Format the response with structured links
        ctx.body = {
            id: vendor.id,
            vendor_name: vendor.vendor_name,
            menu_url: vendor.menu_url,
            vendor_description: vendor.vendor_description,
            website: vendor.website,
			vendor_logo: vendor.vendor_logo,
            social_links: {
                instagram: vendor.instagram,
                google_maps: vendor.google_maps,
            },
            review_links: {
                infatuation: vendor.infatuation_link,
                eater: vendor.eater_link,
            },
            status_code: vendor.status_code,
            last_updated: vendor.last_updated,
        };
    } catch (error) {
        console.error(`[server.js] Error fetching vendor:`, error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

/**
 * @swagger
 * /vendors/{id}/meals:
 *   get:
 *     summary: Get all meals for a given vendor
 *     description: Fetches meals for a specific vendor. If no cached meals exist, it triggers scraping.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor
 *     responses:
 *       200:
 *         description: List of meals for the vendor
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   meal_id:
 *                     type: integer
 *                   meal_name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   ingredients:
 *                     type: string
 *                   dietary_alignment:
 *                     type: string
 *                   price:
 *                     type: string
 *                   meal_photos:
 *                     type: string
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Scraper failed or internal server error
 */

router.get('/vendors/:id/meals', async (ctx) => {
    console.log(`[server.js] Fetching meals for vendor ${ctx.params.id}`);

    try {
        const vendor = await knex('vendors').where({ id: ctx.params.id }).first();
        if (!vendor) {
            console.error(`[server.js] Vendor ID ${ctx.params.id} not found`);
            ctx.status = 404;
            ctx.body = { error: "Vendor not found" };
            return;
        }

        const meals = await knex('meals').where({ vendor_id: ctx.params.id });

        if (meals.length > 0) {
            console.log(`[server.js] Serving ${meals.length} cached meals`);
            ctx.body = meals;
            return;
        }

        console.log(`[server.js] No cached meals. Scraping menu from: ${vendor.menu_url}`);

        addJob({ vendor_id: vendor.id, menu_url: vendor.menu_url });

        ctx.status = 202;
        ctx.body = { status: 202, message: 'Scraping in progress, please check back later for the meals' };

    } catch (error) {
        console.error(`[server.js] Error fetching meals:`, error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Add a new vendor
 *     description: Adds a vendor with minimal details and triggers metadata scraping.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendor_name
 *               - website
 *               - menu_url
 *             properties:
 *               vendor_name:
 *                 type: string
 *               website:
 *                 type: string
 *               menu_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor added successfully, metadata fetching triggered.
 *       400:
 *         description: Invalid input or vendor URL unreachable.
 *       500:
 *         description: Server error.
 */
router.post('/vendors', async (ctx) => {
    const { vendor_name, website, menu_url } = ctx.request.body;

    if (!vendor_name || !website || !menu_url) {
        ctx.status = 400;
        ctx.body = { error: "vendor_name, website, and menu_url are required" };
        return;
    }

    console.log(`[server.js] Adding new vendor: ${vendor_name}`);

    let status_code = 404;
    try {
        const response = await axios.get(website);
        if (response.status === 200) {
            status_code = 200;
        }
    } catch (error) {
        console.error(`[server.js] Website URL not reachable: ${website}`);
        ctx.status = 400;
        ctx.body = { error: "Website URL is unreachable" };
        return;
    }

    // ✅ Insert basic vendor details
    const [vendor] = await knex('vendors')
        .insert({ 
            vendor_name, 
            website,  // Fixed: Using `website` instead of `vendor_url`
            menu_url, 
            status_code, 
            last_updated: knex.fn.now()
        })
        .returning('*');

    console.log(`[server.js] Triggering vendor metadata scraping...`);

    try {
        const pythonOutput = execSync(`python3 fetch_vendor_data.py "${website}"`, { encoding: 'utf-8' });
        const scrapedData = JSON.parse(pythonOutput);

        if (!scrapedData || scrapedData.length === 0) {
            console.warn(`[server.js] Scraper ran but returned empty results`);
        } else {
            const vendorMetadata = scrapedData[0]; // Assuming one vendor per fetch

            // ✅ Update vendor with scraped metadata
            await knex('vendors')
                .where({ id: vendor.id })
                .update({
                    vendor_description: vendorMetadata.vendor_description || "NA",
                    website: vendorMetadata.website || "NA",
                    instagram: vendorMetadata.instagram || "NA",
                    google_maps: vendorMetadata.google_maps || "NA",
                    review_links: JSON.stringify({
                        infatuation: vendorMetadata.infatuation_link || "NA",
                        eater: vendorMetadata.eater_link || "NA",
                        resy: vendorMetadata.resy_link || "NA",
                        opentable: vendorMetadata.opentable_link || "NA",
                        yelp: vendorMetadata.yelp_link || "NA"
                    }),
                    vendor_logo: vendorMetadata.vendor_logo || "NA",
                    last_updated: knex.fn.now()
                });

            console.log(`[server.js] Vendor metadata updated for ${vendor.vendor_name}`);
        }
    } catch (error) {
        console.error(`[server.js] Vendor metadata scraping failed:`, error);
    }

    // Fetch the updated vendor details
    const updatedVendor = await knex('vendors').where({ id: vendor.id }).first();

    ctx.status = 201;
    ctx.body = {
        id: updatedVendor.id,
        vendor_name: updatedVendor.vendor_name,
        vendor_description: updatedVendor.vendor_description,
        vendor_logo: updatedVendor.vendor_logo,
        website: updatedVendor.website,
        social_links: {
            instagram: updatedVendor.instagram
        }
    };    

});

/**
 * @swagger
 * /vendors/{id}/scrape:
 *   post:
 *     summary: Force scrape a vendor's menu
 *     description: Scrapes a vendor's menu and updates the database with new meal data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor to scrape
 *     responses:
 *       200:
 *         description: Scraping completed successfully, returning updated meals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Scraping completed"
 *                 vendor_id:
 *                   type: integer
 *                   example: 1
 *                 updated_meals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1001
 *                       vendor_id:
 *                         type: integer
 *                         example: 1
 *                       meal_name:
 *                         type: string
 *                         example: "Grilled Chicken Salad"
 *                       description:
 *                         type: string
 *                         example: "Fresh greens with grilled chicken, avocado, and balsamic dressing"
 *                       ingredients:
 *                         type: string
 *                         example: "Lettuce, Chicken, Avocado, Balsamic Dressing"
 *                       dietary_alignment:
 *                         type: string
 *                         example: "Gluten-Free, High-Protein"
 *                       price:
 *                         type: string
 *                         example: "$14.99"
 *                       meal_photos:
 *                         type: string
 *                         example: "https://example.com/images/grilled_chicken_salad.jpg"
 *                       url:
 *                         type: string
 *                         example: "https://example.com/menu/grilled-chicken-salad"
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Vendor not found"
 *       500:
 *         description: Scraping failed or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Scraping failed"
 */
router.post('/vendors/:id/scrape', async (ctx) => {
    console.log(`[server.js] Force scraping vendor ${ctx.params.id}`);

    const vendor = await knex('vendors').where({ id: ctx.params.id }).first();
    if (!vendor) {
        console.error(`[server.js] Vendor ID ${ctx.params.id} not found`);
        ctx.status = 404;
        ctx.body = { error: 'Vendor not found' };
        return;
    }

    try {
        console.log(`[server.js] Running scraper for vendor ${vendor.vendor_name}`);

        const pythonOutput = execSync(`python3 fetch_meal_data.py "${vendor.menu_url}" "meals_output.csv"`, { encoding: 'utf-8' });
        const menuData = JSON.parse(pythonOutput);

        if (!Array.isArray(menuData) || menuData.length === 0) {
            console.error(`[server.js] Scraper ran but returned empty results`);
            ctx.status = 500;
            ctx.body = { error: 'Failed to retrieve scraped meals' };
            return;
        }

        console.log(`[server.js] Deleting old meals for vendor ${vendor.vendor_name}...`);
        await knex('meals').where({ vendor_id: vendor.id }).del();

        console.log(`[server.js] Inserting ${menuData.length} new meals...`);
        await knex('meals').insert(menuData.map(meal => ({
            vendor_id: vendor.id,
            meal_name: meal.meal_name,
            description: meal.description,
            ingredients: meal.ingredients,
            dietary_alignment: meal.dietary_alignment,
            price: meal.price,
            meal_photos: meal.meal_photos,
            url: meal.url,
        })));

        console.log(`[server.js] Successfully updated meals for ${vendor.vendor_name}`);

        // ✅ Return only the updated meals with new structure
        const updatedMeals = await knex('meals').where({ vendor_id: vendor.id }).select('*');

        ctx.body = {
            status: "Scraping completed",
            vendor_id: vendor.id,
            updated_meals: updatedMeals
        };

    } catch (error) {
        console.error(`[server.js] Scraping failed:`, error);

        // Don't delete old meals if scraping fails
        ctx.status = 500;
        ctx.body = { error: 'Scraping failed. Previous meals were retained.' };
    }
});

/**
 * @swagger
 * /vendors/{id}:
 *   delete:
 *     summary: Delete a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Internal server error
 */
router.delete('/vendors/:id', async (ctx) => {
    console.log(`[server.js] Deleting vendor ${ctx.params.id}`);

    const vendorId = parseInt(ctx.params.id, 10); // Ensure it's an integer
    if (isNaN(vendorId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid vendor ID' };
        return;
    }

    try {
        // Check if the vendor exists before deleting
        const vendor = await knex('vendors').where({ id: vendorId }).first();
        if (!vendor) {
            console.error(`[server.js] Vendor ID ${vendorId} not found`);
            ctx.status = 404;
            ctx.body = { error: 'Vendor not found' };
            return;
        }

        // Delete the vendor
        await knex('vendors').where({ id: vendorId }).del();

        console.log(`[server.js] Vendor ID ${vendorId} deleted successfully`);
        ctx.body = { status: "Vendor deleted", vendor_id: vendorId };

    } catch (error) {
        console.error(`[server.js] Error deleting vendor:`, error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

/**
 * @swagger
 * /meals:
 *   get:
 *     summary: Get all meals across vendors
 *     responses:
 *       200:
 *         description: Successfully fetched all meals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   vendor_id:
 *                     type: integer
 *                   meal_name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   ingredients:
 *                     type: string
 *                   dietary_alignment:
 *                     type: string
 *                   price:
 *                     type: string
 *                   meal_photos:
 *                     type: string
 *                   website:
 *                     type: string
 *                   instagram:
 *                     type: string
 *                   google_maps:
 *                     type: string
 *                   third_party_review_links:
 *                     type: string
 *                   vendor_description:
 *                     type: string
 *                   vendor_logo:
 *                     type: string
 *                   url:
 *                     type: string
 *       500:
 *         description: Internal Server Error
 */
router.get('/meals', async (ctx) => {
    console.log(`[server.js] Fetching all meals...`);
    const meals = await knex('meals').select('*');

    console.log(`[server.js] Meals Fetched:`, meals); 

    ctx.body = meals;
});

/**
 * @swagger
 * /meals/{id}:
 *   delete:
 *     summary: Delete a meal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Meal deleted successfully
 *       404:
 *         description: Meal not found
 */
router.delete('/meals/:id', async (ctx) => {
    console.log(`[server.js] Deleting meal ${ctx.params.id}`);

    const deleted = await knex('meals').where({ id: ctx.params.id }).del();

    if (!deleted) {
        console.error(`[server.js] Meal ID ${ctx.params.id} not found`);
        ctx.status = 404;
        ctx.body = { error: 'Meal not found' };
        return;
    }

    ctx.status = 204;
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[server.js] Server running on http://localhost:${PORT}`);
	console.log(`[server.js] Swagger Docs at http://localhost:${PORT}/docs`);
});
