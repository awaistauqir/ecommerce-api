require("dotenv").config();

const config = {
  mongodb: {
    url: process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce_db",
    databaseName: "ecommerce_db",
    options: {
      // Modern MongoDB driver options
    },
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog", // Tracks which migrations have run
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};

module.exports = config;
