import { HexNumber, HexString } from '@ckb-lumos/base';
export type Error = {
  code?: number;
  message: string;
} | null;

export type SyningStatus =
  | false
  | {
      startingBlock: number;
      currentBlock: number;
      highestBlock: number;
    };

export type Response = number | string | boolean | SyningStatus | Array<string>;

export type Callback = (err: Error, res?: any | Response) => void;

export type BlockParameter = string | 'latest' | 'earliest' | 'pending';

export interface TransactionCallObject {
  from?: HexString;
  to: HexString;
  gas?: HexNumber;
  gasPrice?: HexNumber;
  value?: HexNumber;
  data?: HexNumber;
}
export interface LogItem {
  account_id: HexNumber;
  service_flag: HexNumber;
  data: HexString;
}
export interface SudtOperationLog {
  sudtId: number;
  fromId: number;
  toId: number;
  amount: bigint;
}

export interface SudtPayFeeLog {
  sudtId: number;
  fromId: number;
  blockProducerId: number;
  amount: bigint;
}

export interface PolyjuiceSystemLog {
  gasUsed: bigint;
  cumulativeGasUsed: bigint;
  createdId: number;
  statusCode: number;
}

export interface PolyjuiceUserLog {
  address: HexString;
  data: HexString;
  topics: HexString[];
}

export type GodwokenLog =
  | SudtOperationLog
  | SudtPayFeeLog
  | PolyjuiceSystemLog
  | PolyjuiceUserLog;
