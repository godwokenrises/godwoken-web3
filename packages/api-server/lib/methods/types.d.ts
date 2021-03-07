export declare type Error = {
    message: string;
} | null;
export declare type SyningStatus = false | {
    startingBlock: number;
    currentBlock: number;
    highestBlock: number;
};
export declare type Response = number | string | boolean | SyningStatus | Array<string>;
export declare type Callback = (err: Error, res?: Response) => {};
