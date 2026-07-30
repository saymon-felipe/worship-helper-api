module.exports = {
    up: async (query) => {
        const existingColumns = await query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'musicas'
              AND COLUMN_NAME IN ('cifra_s3_key', 'cifra_versao')
        `);
        const columnNames = new Set(existingColumns.map((column) => column.COLUMN_NAME));

        if (!columnNames.has('cifra_s3_key')) {
            await query(`ALTER TABLE musicas ADD COLUMN cifra_s3_key VARCHAR(500) NULL AFTER cifra_encoding`);
        }
        if (!columnNames.has('cifra_versao')) {
            await query(`ALTER TABLE musicas ADD COLUMN cifra_versao VARCHAR(64) NULL AFTER cifra_s3_key`);
        }

        await query(`
            CREATE TABLE IF NOT EXISTS imagens_avisos_igreja (
                id INT NOT NULL AUTO_INCREMENT,
                id_aviso INT NOT NULL,
                s3_key VARCHAR(500) NOT NULL,
                imagem_url VARCHAR(500) NOT NULL,
                data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_imagens_avisos_igreja_aviso (id_aviso),
                CONSTRAINT fk_imagens_avisos_igreja_aviso
                    FOREIGN KEY (id_aviso) REFERENCES avisos_igreja (id_aviso_igreja) ON DELETE CASCADE
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS imagens_comentarios_eventos (
                id INT NOT NULL AUTO_INCREMENT,
                id_comentario INT NOT NULL,
                s3_key VARCHAR(500) NOT NULL,
                imagem_url VARCHAR(500) NOT NULL,
                data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_imagens_comentarios_eventos_comentario (id_comentario),
                CONSTRAINT fk_imagens_comentarios_eventos_comentario
                    FOREIGN KEY (id_comentario) REFERENCES comentarios_eventos (id) ON DELETE CASCADE
            )
        `);
    }
};
