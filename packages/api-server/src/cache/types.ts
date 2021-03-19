import { BlockParameter } from '../methods/types';

export interface FilterObject {
    address?: string,
    fromBlock?: BlockParameter,
    toBlock?: BlockParameter,
    topics?: string[],
    blockHash?: string,
}

export type FilterType = FilterObject | 1 | 2; // 1: block filter 2: pending transaction filter
