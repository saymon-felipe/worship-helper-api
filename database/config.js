require("../config/env");

function getDatabaseConfig(includeDatabase = true) {
    const config = {
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        multipleStatements: true
    };

    if (includeDatabase) {
        config.database = process.env.MYSQL_DATABASE || "worship_helper";
    }

    return config;
}

module.exports = {
    getDatabaseConfig,
    databaseName: process.env.MYSQL_DATABASE || "worship_helper"
};
