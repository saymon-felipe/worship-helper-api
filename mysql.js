const mysql = require('mysql2');
const { getDatabaseConfig } = require('./database/config');

let pool = mysql.createPool({
    ...getDatabaseConfig(true),
    "multipleStatements": true
})

exports.pool = pool;
