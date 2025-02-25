// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */

require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_PUBLIC_URL || 'postgresql://postgres:eYHRWsdroQDuRkmPEQeoOUGPzaHqgQem@turntable.proxy.rlwy.net:13596/railway',
      ssl: { rejectUnauthorized: false } // Required for secure Railway connections
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};
