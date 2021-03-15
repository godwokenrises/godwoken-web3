// Update with your config settings.
require('ts-node/register');
require('dotenv').config({path: "./.env"});
module.exports = {

  development: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations"
    }
  }

};
