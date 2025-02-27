/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('vendors', (table) => {
        table.increments('id').primary();
        table.string('vendor_name').notNullable().unique();
        table.string('menu_url').notNullable();
        table.string('website');
        table.string('instagram');
        table.string('google_maps');
        table.jsonb('review_links').defaultTo('{}'); // JSON for structured links
        table.text('vendor_description');
        table.string('vendor_logo');
        table.integer('status_code').defaultTo(404);
        table.timestamp('last_updated').defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('meals', (table) => {
        table.increments('id').primary();
        table.integer('vendor_id').unsigned().references('id').inTable('vendors').onDelete('CASCADE');
        table.string('meal_name').notNullable();
        table.text('description');
        table.text('ingredients');
        table.string('dietary_alignment');
        table.string('price');
        table.string('meal_photos');
        table.string('url');
        table.unique(['vendor_id', 'meal_name']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('meals');
    await knex.schema.dropTableIfExists('vendors');
};
