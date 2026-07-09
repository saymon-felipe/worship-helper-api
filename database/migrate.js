const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const { getDatabaseConfig, databaseName } = require("./config");

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function createConnection(includeDatabase = true) {
    return mysql.createConnection(getDatabaseConfig(includeDatabase));
}

function query(connection, sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

async function connectWithRetry(includeDatabase = true, attempts = 30) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        const connection = createConnection(includeDatabase);

        try {
            await new Promise((resolve, reject) => {
                connection.connect((error) => error ? reject(error) : resolve());
            });
            return connection;
        } catch (error) {
            lastError = error;
            connection.destroy();
            await wait(2000);
        }
    }

    throw lastError;
}

async function runMigrations() {
    const bootstrapConnection = await connectWithRetry(false);

    try {
        await query(
            bootstrapConnection,
            `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
    } finally {
        bootstrapConnection.end();
    }

    const connection = await connectWithRetry(true);

    try {
        await query(connection, `
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const migrationsPath = path.join(__dirname, "migrations");
        const migrationFiles = fs
            .readdirSync(migrationsPath)
            .filter((file) => file.endsWith(".js"))
            .sort();

        const appliedRows = await query(connection, "SELECT name FROM schema_migrations");
        const applied = new Set(appliedRows.map((row) => row.name));

        for (const file of migrationFiles) {
            if (applied.has(file)) {
                continue;
            }

            const migration = require(path.join(migrationsPath, file));
            await migration.up((sql, params) => query(connection, sql, params));
            await query(connection, "INSERT INTO schema_migrations (name) VALUES (?)", [file]);
            console.log(`Migration aplicada: ${file}`);
        }
    } finally {
        connection.end();
    }
}

module.exports = {
    runMigrations
};
