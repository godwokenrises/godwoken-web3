import { Knex as KnexType } from "knex";

export async function up(knex: KnexType): Promise<void> {
  await knex.schema.createTable(
    "accounts",
    function (table: KnexType.TableBuilder) {
      table.increments();
      table.binary("eth_address").notNullable().unique();
      table.binary("gw_short_address").notNullable().index();
    }
  );
}

export async function down(knex: KnexType): Promise<void> {
  await knex.schema.dropTable("accounts");
}
