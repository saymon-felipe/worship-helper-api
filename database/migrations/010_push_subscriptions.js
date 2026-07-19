async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            endpoint_hash CHAR(64) NOT NULL,
            subscription LONGTEXT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            data_atualizacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_push_subscriptions_endpoint (endpoint_hash),
            KEY idx_push_subscriptions_usuario (id_usuario),
            CONSTRAINT fk_push_subscriptions_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = {
    up
};
