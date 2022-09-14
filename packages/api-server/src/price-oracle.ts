import { Store } from "./cache/store";
import fetch from "cross-fetch";
import { BaseWorker } from "./base/worker";
import { Price } from "./base/gas-price";
import Decimal from "decimal.js";

// worker const
const CACHE_EXPIRED_TIME = 5 * 60000 + 30000; // 5 and a half minutes
const POLL_TIME_INTERVAL = 30000; // 30s
const LIVENESS_CHECK_INTERVAL = 5000; // 5s

// ckb price const
const PRICE_DIFF = 0.05; // 5%
const PRICE_UPDATE_WINDOW = 5 * 60000; // 5 minutes
const CKB_PRICE_CACHE_KEY = "priceOracle:ckbUsd";

export class CKBPriceOracle extends BaseWorker {
  private cacheStore: Store;
  private readonly: boolean;

  constructor({
    readonly = false,
    pollTimeInterval = POLL_TIME_INTERVAL,
    livenessCheckInterval = LIVENESS_CHECK_INTERVAL,
    expiredTime = CACHE_EXPIRED_TIME,
  } = {}) {
    super({ pollTimeInterval, livenessCheckInterval });
    this.cacheStore = new Store(true, expiredTime);
    this.readonly = readonly;
  }

  startForever(): Promise<void> {
    if (this.readonly) {
      throw new Error("readonly oracle cannot start forever working");
    }
    return super.startForever();
  }

  start(): Promise<void> {
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

    if (
      price == null ||
      ttl <= CACHE_EXPIRED_TIME - PRICE_UPDATE_WINDOW ||
      calcDiff(+newPrice, +price) > PRICE_DIFF
    ) {
      await this.cacheStore.insert(CKB_PRICE_CACHE_KEY, newPrice);
      return this.pollTimeInterval;
    }

    return this.pollTimeInterval;
  }

  async price(): Promise<string> {
    const price = await this.cacheStore.get(CKB_PRICE_CACHE_KEY);
    if (price == null) {
      return await this.pollPrice();
    }
    return price;
  }

  async minGasPrice(): Promise<bigint> {
    const ckbPrice = await this.price();
    return Price.from(ckbPrice).toMinGasPrice();
  }

  async minFeeRate(): Promise<bigint> {
    const ckbPrice = await this.price();
    return Price.from(ckbPrice).toMinFeeRate();
  }

  private async sendRequest(url: string) {
    let response = await fetch(url);
    if (response.status === 200) {
      let data = await response.text();
      return data;
    } else {
      throw new Error("fetch failed, error code " + response.status);
    }
  }

  private async pollPrice(): Promise<string> {
    // rate-limit: 50 requests 1 minute
    const coingecko = async () => {
      const tokenId = "nervos-network";
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
      const res = await this.sendRequest(url);
      const resObj = JSON.parse(res);
      if (!("usd" in resObj[tokenId])) {
        throw new Error(`request to ${url} error, result: ${res}`);
      }
      return new Decimal(resObj[tokenId].usd).toString();
    };

    // rate-limit: 160000 requests 1 day, 50 requests 10 seconds
    const binance = async () => {
      const symbol = "CKBUSDT";
      const url = `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=1`;
      const res = await this.sendRequest(url);
      const resObj = JSON.parse(res);
      if (
        !Array.isArray(resObj) ||
        resObj.length != 1 ||
        !("price" in resObj[0])
      ) {
        throw new Error(`request to ${url} error, result: ${res}`);
      }
      return new Decimal(resObj[0]["price"]).toString();
    };

    // rate-limit: 100 requests per second each
    const cryptocom = async () => {
      const symbol = "CKB_USDT";
      const url = `https://api.crypto.com/v2/public/get-trades?instrument_name=${symbol}`;
      const res = await this.sendRequest(url);
      const resObj = JSON.parse(res);
      if (resObj.code != 0 || !("result" in resObj)) {
        throw new Error(`request to ${url} error, result: ${res}`);
      }
      return new Decimal(resObj.result.data[0].p).toString();
    };

    const prices = await Promise.all([coingecko(), binance(), cryptocom()]);

    // return median price;
    return prices.sort()[1];
  }
}

function calcDiff(n1: number, n2: number) {
  return Math.abs(n1 - n2) / n2;
}
