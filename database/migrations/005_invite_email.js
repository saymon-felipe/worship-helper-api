async function columnExists(query, table, columnName) {
    const results = await query(
        `
            SELECT
                COUNT(1) AS total
            FROM
                information_schema.columns
            WHERE
                table_schema = DATABASE()
            AND
                table_name = ?
            AND
                column_name = ?
        `,
        [table, columnName]
    );

    return results[0].total > 0;
}

async function indexExists(query, table, indexName) {
    const results = await query(
        `
            SELECT
                COUNT(1) AS total
            FROM
                information_schema.statistics
            WHERE
                table_schema = DATABASE()
            AND
                table_name = ?
            AND
                index_name = ?
        `,
        [table, indexName]
    );

    return results[0].total > 0;
}

async function up(query) {
    await query("ALTER TABLE convites_membros_igreja MODIFY COLUMN id_usuario_requisitado INT NULL");

    if (!(await columnExists(query, "convites_membros_igreja", "email_usuario_requisitado"))) {
        await query("ALTER TABLE convites_membros_igreja ADD COLUMN email_usuario_requisitado VARCHAR(100) NULL");
    }

    if (!(await indexExists(query, "convites_membros_igreja", "idx_convites_email_status"))) {
        await query("CREATE INDEX idx_convites_email_status ON convites_membros_igreja (email_usuario_requisitado, data_confirmacao)");
    }
}

module.exports = {
    up
};
