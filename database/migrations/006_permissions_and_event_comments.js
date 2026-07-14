async function columnExists(query, table, columnName) {
    const results = await query(
        `
            SELECT COUNT(1) AS total
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = ?
            AND column_name = ?
        `,
        [table, columnName]
    );

    return results[0].total > 0;
}

async function up(query) {
    if (!(await columnExists(query, "funcoes_igreja", "permissoes"))) {
        await query("ALTER TABLE funcoes_igreja ADD COLUMN permissoes TEXT NULL");
    }

    await query(`
        CREATE TABLE IF NOT EXISTS comentarios_eventos (
            id INT NOT NULL AUTO_INCREMENT,
            id_evento INT NOT NULL,
            id_usuario INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            mensagem VARCHAR(280) NOT NULL,
            parent_id INT NULL,
            PRIMARY KEY (id),
            KEY idx_comentarios_eventos_evento (id_evento),
            KEY idx_comentarios_eventos_usuario (id_usuario),
            KEY idx_comentarios_eventos_parent (parent_id),
            CONSTRAINT fk_comentarios_eventos_evento
                FOREIGN KEY (id_evento) REFERENCES eventos (id) ON DELETE CASCADE,
            CONSTRAINT fk_comentarios_eventos_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_comentarios_eventos_parent
                FOREIGN KEY (parent_id) REFERENCES comentarios_eventos (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS curtidas_comentarios_eventos (
            id INT NOT NULL AUTO_INCREMENT,
            id_usuario INT NOT NULL,
            id_comentario INT NOT NULL,
            data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_curtidas_comentarios_eventos (id_usuario, id_comentario),
            KEY idx_curtidas_comentarios_eventos_comentario (id_comentario),
            CONSTRAINT fk_curtidas_comentarios_eventos_usuario
                FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
            CONSTRAINT fk_curtidas_comentarios_eventos_comentario
                FOREIGN KEY (id_comentario) REFERENCES comentarios_eventos (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

module.exports = {
    up
};
