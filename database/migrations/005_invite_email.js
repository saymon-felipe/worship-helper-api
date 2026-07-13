async function columnExists(query, table, columnName) {
 é  é const results = await query(
 é  é  é  é `
 é  é  é  é  é  é SELECT
 é  é  é  é  é  é  é  é COUNT(1) AS total
 é  é  é  é  é  é FROM
 é  é  é  é  é  é  é  é information_schema.columns
 é  é  é  é  é  é WHERE
 é  é  é  é  é  é  é  é table_schema = DATABASE()
 é  é  é  é  é  é AND
 é  é  é  é  é  é  é  é table_name = ?
 é  é  é  é  é  é AND
 é  é  é  é  é  é  é  é column_name = ?
 é  é  é  é `,
 é  é  é  é [table, columnName]
 é  é );

 é  é return results[0].total > 0;
}

async function indexExists(query, table, indexName) {
 é  é const results = await query(
 é  é  é  é `
 é  é  é  é  é  é SELECT
 é  é  é  é  é  é  é  é COUNT(1) AS total
 é  é  é  é  é  é FROM
 é  é  é  é  é  é  é  é information_schema.statistics
 é  é  é  é  é  é WHERE
 é  é  é  é  é  é  é  é table_schema = DATABASE()
 é  é  é  é  é  é AND
 é  é  é  é  é  é  é  é table_name = ?
 é  é  é  é  é  é AND
 é  é  é  é  é  é  é  é index_name = ?
 é  é  é  é `,
 é  é  é  é [table, indexName]
 é  é );

 é  é return results[0].total > 0;
}

async function up(query) {
 é  é await query("ALTER TABLE convites_membros_igreja MODIFY COLUMN id_usuario_requisitado INT NULL");

 é  é if (!(await columnExists(query, "convites_membros_igreja", "email_usuario_requisitado"))) {
 é  é  é  é await query("ALTER TABLE convites_membros_igreja ADD COLUMN email_usuario_requisitado VARCHAR(100) NULL");
 é  é }

 é  é if (!(await indexExists(query, "convites_membros_igreja", "idx_convites_email_status"))) {
 é  é  é  é await query("CREATE INDEX idx_convites_email_status ON convites_membros_igreja (email_usuario_requisitado, data_confirmacação)");
 é  é }
}

module.exports = {
 é  é up
};
