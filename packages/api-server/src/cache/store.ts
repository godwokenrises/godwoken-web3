import { createClient } from "redis";
import { RedisClientType } from "redis/dist/lib/client";
import { envConfig } from "../base/env-config";

export class Store {
  public client: RedisClientType;

  constructor() {
    const url = envConfig.redisUrl;
    this.client = createClient({
      url: url,
    });

    this.client.on("error", (err) => console.log("Redis Client Error", err));
  }

  async init() {
    await this.client.connect();
  }

  async insert(table: string, filed: string, value: string) {
    return await this.client.hSet(table, filed, value);
  }

  async delete(table: string, filed: string) {
    return await this.client.hDel(table, filed);
  }

  async get(table: string, filed: string) {
    return await this.client.hGet(table, filed);
  }

  async size(table: string) {
    return await this.client.hLen(table);
  }

  async getAll(table: string) {
    return await this.client.hGetAll(table);
  }

  async setKV(key: string, value: number | string) {
    return await this.client.set(key, value.toString());
  }

  async getKV(key: string) {
    return await this.client.get(key);
  }

  async deleteKV(key: string) {
    return await this.client.del(key);
  }

  async addSet(name: string, members: string | string[]) {
    return await this.client.sAdd(name, members);
  }
}

export class SingleFieldTable {
  public store: Store;
  public tableName: string;

  constructor(tableName: string, store?: Store) {
    this.store = store || new Store();
    this.tableName = tableName;
  }

  async _connect() {
    await this.store.init();
  }

  _isConnected() {
    return this.store.client.isOpen;
  }

  // only support single field
  async _insert(key: string, value: number | string) {
    return await this.store.insert(this.tableName, key, value.toString());
  }

  async _update(key: string, newValue: number | string) {
    return await this.store.insert(this.tableName, key, newValue.toString());
  }

  async _delete(key: string) {
    return await this.store.delete(this.tableName, key);
  }

  async _get(key: string) {
    return await this.store.get(this.tableName, key);
  }

  async _getAll() {
    return await this.store.getAll(this.tableName);
  }

  async _size() {
    return await this.store.size(this.tableName);
  }
}
