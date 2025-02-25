const Koa = require('koa');
const Router = require('koa-router');
const knex = require('knex')(require('./knexfile').development);
const { execSync } = require('child_process');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('koa2-swagger-ui');
const axios = require('axios');

const app = new Koa();
const router = new Router();
const bodyParser = require('koa-bodyparser');
app.use(bodyParser());


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


/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors
 *     responses:
 *       200:
 *         description: List of vendors
 */
router.get('/vendors', async (ctx) => {
    console.log("[server.js] 📜 Fetching all vendors...");
    ctx.body = await knex('vendors').select('*');
});

/**
 * @swagger
 * /vendors/{id}/menu:
 *   get:
 *     summary: Get vendor menu (cached or scraped)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor
 *     responses:
 *       200:
 *         description: Successfully fetched menu
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Scraper failed or no meals found
 */
router.get('/vendors/:id/menu', async (ctx) => {
    console.log(`[server.js] Request for vendor ${ctx.params.id}`);

    const vendor = await knex('vendors').where({ id: ctx.params.id }).first();
    if (!vendor) {
        console.error(`[server.js] Vendor ID ${ctx.params.id} not found`);
        ctx.status = 200;
        ctx.body = { error: 'Vendor not found' };
        return;
    }

    console.log(`[server.js] Found vendor: ${vendor.vendor_name}`);

    const meals = await knex('meals').where({ vendor_id: ctx.params.id });
    if (meals.length > 0) {
        console.log(`[server.js] Serving ${meals.length} cached meals`);
        ctx.body = meals;
        return;
    }

    console.log(`[server.js] No cached meals. Scraping menu from: ${vendor.menu_url}`);

    try {
        const pythonOutput = execSync(`python3 fetch_menu_data.py ${vendor.id} "${vendor.menu_url}"`, { encoding: 'utf-8' });
        const menuData = JSON.parse(pythonOutput);

        if (!menuData || menuData.length === 0) {
            console.error(`[server.js] Scraper ran but returned empty results`);
            ctx.status = 500;
            ctx.body = { error: 'Failed to retrieve scraped meals' };
            return;
        }

        console.log(`[server.js] Storing ${menuData.length} meals in the database...`);

        // ✅ Store flattened data in PostgreSQL
        await Promise.all(menuData.map(meal => {
            return knex('meals').insert({
                vendor_id: vendor.id,
                meal_name: meal.meal_name,
                description: meal.description,
                ingredients: meal.ingredients,
                dietary_alignment: meal.dietary_alignment,
                price: meal.price,
                meal_photos: meal.meal_photos,
                website: meal.website,
                instagram: meal.instagram,
                google_maps: meal.google_maps,
                third_party_review_links: meal.third_party_review_links,
                vendor_description: meal.vendor_description,
                vendor_logo: meal.vendor_logo,
                url: meal.url
            }).onConflict(['vendor_id', 'meal_name']).ignore();
        }));

        console.log(`[server.js] Successfully stored meals for ${vendor.vendor_name}`);
        
        // ✅ Return the stored data
        ctx.body = menuData;

    } catch (error) {
        console.error(`[server.js] Scraper failed:`, error);
        ctx.status = 500;
        ctx.body = { error: 'Scraper failed' };
    }
});


/**
 * @swagger
 * /vendors/{id}/status:
 *   get:
 *     summary: Get vendor details & last updated timestamp
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor
 *     responses:
 *       200:
 *         description: Successfully fetched vendor status
 *       404:
 *         description: Vendor not found
 */
router.get('/vendors/:id/status', async (ctx) => {
    console.log(`[server.js] Checking status for vendor ${ctx.params.id}`);
    const vendor = await knex('vendors').where({ id: ctx.params.id }).first();

    if (!vendor) {
        ctx.status = 404;
        ctx.body = { error: 'Vendor not found' };
        return;
    }

    ctx.body = {
        vendor_name: vendor.vendor_name,
        menu_url: vendor.menu_url,
        status_code: vendor.status_code,
        last_updated: vendor.last_updated,
    };
});

/**
 * @swagger
 * /vendors/{id}/scrape:
 *   post:
 *     summary: Force scrape a vendor menu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vendor
 *     responses:
 *       200:
 *         description: Scraping started successfully
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Scraping failed
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
        
        const pythonOutput = execSync(`python3 fetch_menu_data.py ${vendor.id} "${vendor.menu_url}"`, { encoding: 'utf-8' });
        const menuData = JSON.parse(pythonOutput);

        if (!menuData || menuData.length === 0) {
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
            website: meal.website,
            instagram: meal.instagram,
            google_maps: meal.google_maps,
            third_party_review_links: meal.third_party_review_links,
            vendor_description: meal.vendor_description,
            vendor_logo: meal.vendor_logo,
            url: meal.url
        })));

        console.log(`[server.js] Successfully updated meals for ${vendor.vendor_name}`);
        ctx.body = { status: "Scraping completed", vendor_id: vendor.id };

    } catch (error) {
        console.error(`[server.js] Scraping failed:`, error);
        ctx.status = 500;
        ctx.body = { error: 'Scraping failed' };
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
 *         description: The ID of the vendor to delete
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 */
router.delete('/vendors/:id', async (ctx) => {
    console.log(`[server.js] Attempting to delete vendor ${ctx.params.id}`);

    const vendor = await knex('vendors').where({ id: ctx.params.id }).first();

    if (!vendor) {
        console.error(`[server.js] Vendor ID ${ctx.params.id} not found`);
        ctx.status = 404;
        ctx.body = { error: 'Vendor not found' };
        return;
    }

    console.log(`[server.js] Vendor found: ${vendor.vendor_name}, proceeding with deletion...`);

    // Delete all meals associated with the vendor
    await knex('meals').where({ vendor_id: ctx.params.id }).del();
    console.log(`[server.js] Deleted meals associated with vendor ${ctx.params.id}`);

    // Delete the vendor
    await knex('vendors').where({ id: ctx.params.id }).del();
    console.log(`[server.js] Vendor ${ctx.params.id} successfully deleted`);

    ctx.status = 200;
    ctx.body = { status: "Vendor deleted", vendor_id: ctx.params.id };
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

    console.log(`[server.js] Meals Fetched:`, meals);  // 🔍 Debugging Log

    ctx.body = meals;
});


/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Add a new vendor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendor_name:
 *                 type: string
 *               menu_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor added successfully
 */
router.post('/vendors', async (ctx) => {
    const { vendor_name, menu_url } = ctx.request.body;
    console.log(`[server.js] Adding new vendor: ${vendor_name}`);

    let status_code = 404;
    try {
        const response = await axios.get(menu_url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        console.log(`[server.js] status: ${response.status}`);
        if (response.status == 200) {
            status_code = 200;
        }
    } catch (error) {
        console.log(`[server.js] URL not reachable: ${menu_url}`);
    }

    const [vendor] = await knex('vendors')
        .insert({ vendor_name, menu_url, status_code, last_updated: knex.fn.now() })
        .returning('*');

    ctx.status = 201;
    ctx.body = vendor;
});

/**
 * @swagger
 * /vendors/{id}/meals:
 *   get:
 *     summary: Get all meals for a given vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of meals for vendor
 *       404:
 *         description: Vendor not found
 */
router.get('/vendors/:id/meals', async (ctx) => {
    console.log(`[server.js] Fetching meals for vendor ${ctx.params.id}`);

    // ✅ Check if vendor exists
    const vendor = await knex('vendors').where({ id: ctx.params.id }).first();
    if (!vendor) {
        console.error(`[server.js] Vendor ID ${ctx.params.id} not found`);
        ctx.status = 404;
        ctx.body = { error: "Vendor not found" };
        return;
    }

    // ✅ Fetch meals for vendor
    const meals = await knex('meals').where({ vendor_id: ctx.params.id });

    // ✅ Return meals (even if empty)
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
