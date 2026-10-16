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
    // Local/endereco do evento. Opcional: eventos antigos (e os criados sem o switch de local) ficam com NULL.
    if (!(await columnExists(query, "eventos", "local_evento"))) {
        await query("ALTER TABLE eventos ADD COLUMN local_evento VARCHAR(255) NULL");
    }
}

module.exports = {
    up
};
