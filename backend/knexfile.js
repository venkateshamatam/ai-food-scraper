// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'parkday_user',
      password: process.env.DB_PASSWORD || 'parkday_pass',
      database: process.env.DB_NAME || 'parkday'
    },
    pool: {
      min: 2,
      max: 20
    },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' }
  }
};