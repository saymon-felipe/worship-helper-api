module.exports = {
    up: async (query) => {
        const columns = await query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'musicas'
              AND COLUMN_NAME IN ('cifra_conteudo', 'cifra_encoding')
        `);
        const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));

        for (const columnName of ['cifra_conteudo', 'cifra_encoding']) {
            if (existingColumns.has(columnName)) {
                await query(`ALTER TABLE musicas DROP COLUMN ${columnName}`);
            }
        }
    }
};
