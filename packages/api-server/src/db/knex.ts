import Knex from "knex";
import { Store } from "../cache/store";
import { envConfig } from "../base/env-config";
import { logger } from "../base/logger";
import {
  TIP_BLOCK_HASH_CACHE_KEY,
  QUERY_CACHE_EXPIRED_TIME_MS,
} from "../cache/constant";

// init cache
const cacheStore: Store = new Store(
  envConfig.redisUrl,
  true,
  QUERY_CACHE_EXPIRED_TIME_MS
);
cacheStore.init();

const MAX_CACHE_SIZE = 100 * 1024; // 100k

declare module "knex" {
  namespace Knex {
    interface QueryInterface<TRecord extends {} = any, TResult = any> {
      cache: Select<TRecord, TResult>;
    }
  }
}

Knex.QueryBuilder.extend("cache", function useCache(this) {
  return getCacheKey(this).then((cacheKey) => {
    return cacheStore.get(cacheKey).then((value) => {
      // use cache
      if (value != null) {
        const data = JSON.parse(value);
        return deserializeData(data);
      }

      // query from db
      return this.then((data) => {
        if (data == null) {
          return data;
        }

        // limit cache size
        const size = Buffer.from(JSON.stringify(data), "utf-8").byteLength;
        if (size > MAX_CACHE_SIZE) {
          logger.debug(
            `Max cache size(${MAX_CACHE_SIZE} bytes) exceed, total ${size} bytes.`
          );
          return data;
        }

        let sData;
        try {
          sData == serializeData(data);
          cacheStore.insert(cacheKey, JSON.stringify(serializeData(data)));
        } catch (error: any) {
          logger.error("abort to cache the result, ", error.message);
        }

        return data;
      }) as any;
    }) as any;
  }) as any;
});

// cacheKey format:
//    `${SQL select str}:${tipBlockHash.slice(0,10)}`
function getCacheKey(builder: any) {
  const querySql = builder.toSQL();
  let sql = querySql.sql.toString();
  const bindings = querySql.toNative().bindings;
  for (let bind of bindings) {
    if (bind != null) {
      const bindStr =
        bind instanceof Buffer ? bind.toString("hex") : bind.toLocaleString();
      sql = sql.replace("?", bindStr);
    }
  }
  return Promise.resolve(cacheStore.get(TIP_BLOCK_HASH_CACHE_KEY)).then(
    (tipBlockHash: string | null) => {
      const tipHashSlice = tipBlockHash
        ? tipBlockHash.slice(0, 10)
        : "0x" + "0".repeat(8);
      const cacheKey = `${sql}:${tipHashSlice}`;
      return cacheKey;
    }
  );
}

// support all types from db table field
function normalizeDataType(data: any): Data {
  if (data == null) {
    return {
      type: DataType.NULLABLE,
      value: undefined,
    };
  }

  if (typeof data === "string") {
    return {
      type: DataType.STRING,
      value: data,
    };
  }

  if (typeof data === "number") {
    return {
      type: DataType.NUMBER,
      value: data,
    };
  }

  if (typeof data === "bigint") {
    return {
      type: DataType.BIGINT,
      value: data,
    };
  }

  if (typeof data === "boolean") {
    return {
      type: DataType.BOOLEAN,
      value: data,
    };
  }

  if (data instanceof Date) {
    return {
      type: DataType.DATE,
      value: data,
    };
  }

  if (data instanceof Buffer) {
    return {
      type: DataType.BUFFER,
      value: data,
    };
  }

  if (Array.isArray(data)) {
    return {
      type: DataType.ARRAY,
      value: data,
    };
  }

  if (typeof data === "object") {
    return {
      type: DataType.OBJ,
      value: data,
    };
  }

  throw new Error("un supported type" + typeof data);
}

function serializeData(data: any): SerializableData {
  const { type, value } = normalizeDataType(data);
  switch (type) {
    case DataType.NULLABLE:
      return {
        type,
        value: "undefined",
      };

    case DataType.STRING:
      return {
        type,
        value: value as string,
      };

    case DataType.NUMBER:
      return {
        type,
        value: value as number,
      };

    case DataType.BIGINT: {
      const data = "0x" + (value as bigint).toString(16);
      return {
        type,
        value: data,
      };
    }

    case DataType.BOOLEAN: {
      const data = (value as boolean).toString();
      return {
        type,
        value: data,
      };
    }

    case DataType.BUFFER: {
      const data = "0x" + (value as Buffer).toString("hex");
      return {
        type,
        value: data,
      };
    }

    case DataType.DATE: {
      const data = (value as Date).toString();
      return {
        type,
        value: data,
      };
    }

    case DataType.ARRAY: {
      let data: SerializableData[] = (value as Array<DataType>).map((v) =>
        serializeData(v)
      );
      return {
        type,
        value: data,
      };
    }

    case DataType.OBJ: {
      let data: any = {};
      for (const k in value as any) {
        let v = (value as any)[k];
        data[k] = serializeData(v);
      }
      return {
        type,
        value: data,
      };
    }
  }
}

function deserializeData(data: any): DataValue {
  const { type, value } = data;

  switch (type) {
    case DataType.NULLABLE:
      return undefined;

    case DataType.STRING:
      return value as string;

    case DataType.NUMBER:
      return +value;

    case DataType.BIGINT: {
      const data = BigInt(value);
      return data;
    }

    case DataType.BOOLEAN: {
      const data: boolean = JSON.parse(value);
      return data;
    }

    case DataType.BUFFER: {
      const data = Buffer.from(value.slice(2), "hex");
      return data;
    }

    case DataType.DATE: {
      const data = new Date(value);
      return data;
    }

    case DataType.ARRAY: {
      return (value as Array<any>).map((v) => deserializeData(v));
    }

    case DataType.OBJ: {
      let data: any = {};
      for (const k in value) {
        let v: { type: DataType; value: any } = value[k];
        data[k] = deserializeData(v);
      }
      return data as object;
    }

    default:
      throw new Error("unsupported type: " + type);
  }
}

interface Data {
  type: DataType;
  value: DataValue;
}

enum DataType {
  NULLABLE,
  STRING,
  NUMBER,
  BIGINT,
  BOOLEAN,
  BUFFER,
  DATE,
  ARRAY,
  OBJ,
}

type DataValue =
  | Nullable
  | string
  | number
  | bigint
  | boolean
  | Buffer
  | Date
  | Array<DataValue>
  | object;

interface SerializableData {
  type: DataType;
  value: SerializableDataValue;
}

type SerializableDataValue = string | number | Array<SerializableData>;

type Nullable = null | undefined;
