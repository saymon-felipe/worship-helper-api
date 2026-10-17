// Endpoints de push que o servico (FCM, Apple) ja recusou com 404/410. A marca fica mesmo depois de apagar a
// assinatura: o aparelho continua com a assinatura morta guardada e a reenviaria na proxima abertura do app.
async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS push_endpoints_invalidos (
            endpoint_hash CHAR(64) NOT NULL,
            data_invalidacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (endpoint_hash)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = { up };
