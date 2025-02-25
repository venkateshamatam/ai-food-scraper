/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema
	  .createTable('vendors', function (table) {
		table.increments('id').primary();
		table.string('vendor_name').notNullable();
		table.string('menu_url').notNullable().unique();
		table.integer('status_code');
		table.timestamp('last_updated').defaultTo(knex.fn.now());
	  })
	  .createTable('meals', function (table) {
		table.increments('id').primary();
		table.integer('vendor_id').references('id').inTable('vendors').onDelete('CASCADE');
		table.string('meal_name').notNullable();
		table.text('description');
		table.text('ingredients');
		table.string('dietary_alignment');
		table.string('price');
		table.text('meal_photos');
		table.text('website');
		table.text('instagram');
		table.text('google_maps');
		table.text('third_party_review_links');
		table.text('vendor_description');
		table.text('vendor_logo');
		table.text('url');
  
		// Add unique constraint to prevent duplicate meals
		table.unique(['vendor_id', 'meal_name']);
	  });
  };
  
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema
	  .dropTable('meals')
	  .dropTable('vendors');
  };