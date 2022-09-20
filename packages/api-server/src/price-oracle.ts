import { Store } from "./cache/store";
import axios from "axios";
import { BaseWorker } from "./base/worker";
import {
  FEE_RATE_MULTIPLIER,
  MIN_GAS_PRICE_LOWER_LIMIT,
  Price,
} from "./base/gas-price";
import Decimal from "decimal.js";
import { Query } from "./db/query";
import { envConfig } from "./base/env-config";
import { logger } from "./base/logger";

// worker const
const CACHE_EXPIRED_TIME = 5 * 60000 + 30000; // 5 and a half minutes
const POLL_TIME_INTERVAL = 30000; // 30s
const LIVENESS_CHECK_INTERVAL = 5000; // 5s

// poll price timeout
const POLL_REQUEST_TIME_OUT = 10000; // 10s

// ckb price const
const PRICE_DIFF_PERCENTAGE_THRESHOLD = "0.05"; // if diff larger than 5%, update the price
const PRICE_UPDATE_WINDOW = 5 * 60000; // 5 minutes
export const CKB_PRICE_CACHE_KEY = "priceOracle:ckbUsd";

// gas price cache
const GAS_PRICE_CACHE_KEY = `priceOracle:gasPrice`;

export class CKBPriceOracle extends BaseWorker {
  private cacheStore: Store;
  private readonly: boolean;
  private query: Query;
  private gasPriceCacheMilSec: number;

  constructor({
    readonly = false,
    pollTimeInterval = POLL_TIME_INTERVAL,
    livenessCheckInterval = LIVENESS_CHECK_INTERVAL,
    expiredTime = CACHE_EXPIRED_TIME,
  } = {}) {
    super({ pollTimeInterval, livenessCheckInterval });
    this.cacheStore = new Store(true, expiredTime);
    this.readonly = readonly;

    this.query = new Query();

    const cacheSeconds: number = +(envConfig.gasPriceCacheSeconds || "0");
    this.gasPriceCacheMilSec = cacheSeconds * 1000;
  }

  startForever(): Promise<void> {
    if (this.readonly) {
      throw new Error("readonly oracle cannot start forever working");
    }
    return super.startForever();
  }

  start(): void {
    if (this.readonly) {
      throw new Error("readonly oracle cannot start working");
    }
    return super.start();
  }

  protected async executePoll(): Promise<number> {
    const [newPrice, price, ttl] = await Promise.all([
      this.pollPrice(),
      this.cacheStore.get(CKB_PRICE_CACHE_KEY),
      this.cacheStore.ttl(CKB_PRICE_CACHE_KEY),
    ]);

    if (newPrice == null) {
      // polling somehow failed, skip;
      return this.pollTimeInterval;
    }

    // condition to update ckb price
    if (
      price == null ||
      ttl <= CACHE_EXPIRED_TIME - PRICE_UPDATE_WINDOW ||
      isPriceDiffOverThreshold(newPrice, price)
    ) {
      await this.cacheStore.insert(CKB_PRICE_CACHE_KEY, newPrice);
      return this.pollTimeInterval;
    }

    return this.pollTimeInterval;
  }

  async price(): Promise<string | null> {
    const price = await this.cacheStore.get(CKB_PRICE_CACHE_KEY);
    return price;
  }

  // Return median gas_price of latest ${LATEST_MEDIAN_GAS_PRICE} transactions
  async gasPrice(): Promise<bigint> {
    // using cache
    if (this.gasPriceCacheMilSec > 0) {
      const cachedGasPrice = await this.cacheStore.get(GAS_PRICE_CACHE_KEY);
      if (cachedGasPrice != null) {
        return BigInt(cachedGasPrice);
      }
    }

    let [medianGasPrice, minGasPrice] = await Promise.all([
      this.query.getMedianGasPrice(),
      this.minGasPrice(),
    ]);
    if (medianGasPrice < minGasPrice) {
      medianGasPrice = minGasPrice;
    }

    // save cache
    if (this.gasPriceCacheMilSec > 0) {
      const medianGasPriceHex = "0x" + medianGasPrice.toString(16);
      this.cacheStore.insert(
        GAS_PRICE_CACHE_KEY,
        medianGasPriceHex,
        this.gasPriceCacheMilSec
      );
    }

    return medianGasPrice;
  }

  async minGasPrice(): Promise<bigint> {
    const ckbPrice = await this.price();
    if (ckbPrice == null) {
      // fallback to minimal
      return MIN_GAS_PRICE_LOWER_LIMIT;
    }
    return Price.from(ckbPrice).toMinGasPrice();
  }

  async minFeeRate(): Promise<bigint> {
    const ckbPrice = await this.price();
    if (ckbPrice == null) {
      // fallback to minimal
      return MIN_GAS_PRICE_LOWER_LIMIT * FEE_RATE_MULTIPLIER;
    }
    return Price.from(ckbPrice).toMinFeeRate();
  }

  private async sendRequest(url: string) {
    const validateStatus = function (status: number) {
      return status === 200;
    };
    const options = {
      validateStatus,
      timeout: POLL_REQUEST_TIME_OUT,
    };

    let response = await axios.get(url, options).catch((error) => {
      if (error.response) {
        // The request was made and the server responded with wrong status code
        throw new Error(
          `[${CKBPriceOracle.name}] sendRequest: response failed, statusCode: ${error.response.status}, data: ${error.response.data}, header: ${error.response.headers}`
        );
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        throw new Error(
          `[${
            CKBPriceOracle.name
          }] sendRequest: request failed, ${JSON.stringify(error.toJSON())}`
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(
          `[${CKBPriceOracle.name}] sendRequest: setup request failed, ${error.message}`
        );
      }
    });
    return response.data;
  }

  private async pollPrice(): Promise<string | null> {
    // rate-limit: 50 requests 1 minute
    const coingecko = async () => {
      const tokenId = "nervos-network";
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
      const resObj = await this.sendRequest(url);
      if (!("usd" in resObj[tokenId])) {
        throw new Error(
          `[${CKBPriceOracle.name}] pollPrice: response from ${url} error, result: ${resObj}`
        );
      }
      return new Decimal(resObj[tokenId].usd).toString();
    };

    // rate-limit: 160000 requests 1 day, 50 requests 10 seconds
    const binance = async () => {
      const symbol = "CKBUSDT";
      const url = `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=1`;
      const resObj = await this.sendRequest(url);
      if (
        !Array.isArray(resObj) ||
        resObj.length != 1 ||
        !("price" in resObj[0])
      ) {
        throw new Error(
          `[${CKBPriceOracle.name}] pollPrice: response from ${url} error, result: ${resObj}`
        );
      }
      return new Decimal(resObj[0]["price"]).toString();
    };

    // rate-limit: 100 requests per second each
    const cryptocom = async () => {
      const symbol = "CKB_USDT";
      const url = `https://api.crypto.com/v2/public/get-trades?instrument_name=${symbol}`;
      const resObj = await this.sendRequest(url);
      if (resObj.code != 0 || !("result" in resObj)) {
        throw new Error(
          `[${CKBPriceOracle.name}] pollPrice: response from ${url} error, result: ${resObj}`
        );
      }
      return new Decimal(resObj.result.data[0].p).toString();
    };

    const settledResult = await Promise.allSettled([
      coingecko(),
      binance(),
      cryptocom(),
    ]);

    const failedResult = settledResult
      .filter((p) => p.status === "rejected")
      .map((p) => (p as PromiseRejectedResult).reason);
    if (failedResult.length > 0) {
      logger.warn(failedResult);
    }

    const prices = settledResult
      .filter((p) => p.status === "fulfilled")
      .map((p) => (p as PromiseFulfilledResult<string>).value);

    if (prices.length === 3) {
      // return median price
      return prices.sort((a, b) =>
        new Decimal(a).sub(new Decimal(b)).toNumber()
      )[1];
    }

    if (prices.length === 2) {
      // return average price
      return average(...prices);
    }

    // only tolerate one request failed
    logger.warn(
      `[${CKBPriceOracle.name}] pollPrice requests only succeed ${prices.length}, required at least 2`
    );
    return null;
  }
}

function isPriceDiffOverThreshold(newPrice: string, oldPrice: string): boolean {
  const threshold = new Decimal(PRICE_DIFF_PERCENTAGE_THRESHOLD);

  // calc diff percentage
  const d1 = new Decimal(newPrice);
  const d2 = new Decimal(oldPrice);
  const diff = d1.sub(d2).abs().div(d2);

  return diff.gt(threshold);
}

function average(...nums: string[]) {
  if (nums.length === 0) {
    throw new Error("at least one when computing average");
  }

  return nums
    .map((n) => new Decimal(n))
    .reduce((prev, current) => prev.add(current), new Decimal(0))
    .div(nums.length)
    .toString();
}
