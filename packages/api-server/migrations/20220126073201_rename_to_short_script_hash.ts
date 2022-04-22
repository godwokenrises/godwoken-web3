import { Knex as KnexType } from "knex";

const ACCOUNTS_TABLE_NAME = "accounts";

export async function up(knex: KnexType): Promise<void> {
  await knex.schema.table(ACCOUNTS_TABLE_NAME, (table) =>
    table.renameColumn("gw_short_address", "gw_short_script_hash")
  );
  await knex.schema.raw(
    "ALTER INDEX IF EXISTS accounts_gw_short_address_index RENAME TO accounts_gw_short_script_hash_index"
  );
}

export async function down(knex: KnexType): Promise<void> {
  await knex.schema.table(ACCOUNTS_TABLE_NAME, (table) =>
    table.renameColumn("gw_short_script_hash", "gw_short_address")
  );
  await knex.schema.raw(
    "ALTER INDEX IF EXISTS accounts_gw_short_script_hash_index RENAME TO accounts_gw_short_address_index"
  );
}
