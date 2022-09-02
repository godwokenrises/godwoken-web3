import web3Utils from "web3-utils";
import { envConfig } from "./env-config";

// lower ckb-usd-price
// we enlarger it to be an integer instead of float
const LOWER_CKB_PRICE = enlargeCkbPrice(0.0038);
// gas-price <= 0.00002 pCKB is desireable,
// since ImToken has an global config: MAX_GAS_PRICE = 21000 GWei
const UPPER_GAS_PRICE = web3Utils.toWei("0.00002", "ether");

// when ckbPrice goes up, the gasPrice goes down (vice versa)
//   1. gasPrice = divider / ckbPrice
//   2. divider = LOWER_CKB_PRICE * UPPER_GAS_PRICE
const GAS_PRICE_DIVIDER = BigInt(UPPER_GAS_PRICE) * BigInt(LOWER_CKB_PRICE);

// feeRate = gasPrice * multiplier
const FEE_RATE_MULTIPLIER = BigInt(100);

// upper-limit and lower-limit to prevent gas-price goes off-track
const DEFAULT_MIN_GAS_PRICE_LOWER_LIMIT = "0.00001"; // uint: pCKB(ether)
const DEFAULT_MIN_GAS_PRICE_UPPER_LIMIT = "0.00004"; // uint: pCKB(ether)

export class Price {
  private ckbPrice: number;
  private upperLimit: bigint; // uint: wei, 18
  private lowerLimit: bigint; // uint: wei, 18

  constructor(ckbPrice: number) {
    this.ckbPrice = ckbPrice;

    this.upperLimit = pCKBToWei(
      envConfig.minGasPriceUpperLimit || DEFAULT_MIN_GAS_PRICE_UPPER_LIMIT
    );

    this.lowerLimit = pCKBToWei(
      envConfig.minGasPriceLowerLimit || DEFAULT_MIN_GAS_PRICE_LOWER_LIMIT
    );
  }

  toGasPrice(): bigint {
    const ckbPrice = BigInt(enlargeCkbPrice(this.ckbPrice));
    const gasPrice = GAS_PRICE_DIVIDER / ckbPrice;
    return gasPrice;
  }

  toMinGasPrice(): bigint {
    const p = this.toGasPrice();
    if (p > this.upperLimit) return this.upperLimit;
    if (p < this.lowerLimit) return this.lowerLimit;
    return p;
  }

  toFeeRate(): bigint {
    return FEE_RATE_MULTIPLIER * this.toGasPrice();
  }

  toMinFeeRate(): bigint {
    return FEE_RATE_MULTIPLIER * this.toMinGasPrice();
  }

  public static from(ckbPrice: number): Price {
    return new Price(ckbPrice);
  }
}

//*** helper function ***/
function enlargeCkbPrice(price: number): string {
  // 0.000000 => 6 precision
  // enlarge it to 10 ** 6
  const precision = 6;
  return String(Math.round(price * 10 ** precision));
}

function pCKBToWei(pCKB: string): bigint {
  return BigInt(web3Utils.toWei(pCKB, "ether"));
}
