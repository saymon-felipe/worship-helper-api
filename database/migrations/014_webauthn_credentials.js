async function up(query) {
    await query(`
        CREATE TABLE IF NOT EXISTS webauthn_credentials (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            credential_id VARCHAR(512) NOT NULL,
            public_key MEDIUMBLOB NOT NULL,
            counter BIGINT UNSIGNED NOT NULL DEFAULT 0,
            transports TEXT NULL,
            device_type VARCHAR(32) NULL,
            backed_up TINYINT(1) NOT NULL DEFAULT 0,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ultimo_uso DATETIME NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_webauthn_credential_id (credential_id),
            KEY idx_webauthn_credentials_usuario (id_usuario),
            CONSTRAINT fk_webauthn_credentials_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS webauthn_challenges (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            tipo VARCHAR(32) NOT NULL,
            challenge VARCHAR(512) NOT NULL,
            expires_at DATETIME NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_webauthn_challenge_usuario_tipo (id_usuario, tipo),
            KEY idx_webauthn_challenges_expiration (expires_at),
            CONSTRAINT fk_webauthn_challenges_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = { up };
