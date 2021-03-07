import { Callback } from '../types';
export declare class Eth {
    constructor();
    /**
     * Returns the current protocol version
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * protocol version as the second argument
     */
    protocolVersion(args: [], callback: Callback): void;
    /**
     * Returns block syning info
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * SyningStatus as the second argument.
     *    SyningStatus: false or { startingBlock, currentBlock, highestBlock }
     */
    syncing(args: [], callback: Callback): void;
    /**
     * Returns client coinbase address, which is always zero hashes
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * 20 bytes 0 hex string as the second argument.
     */
    coinbase(args: [], callback: Callback): void;
    /**
     * Returns if client is mining, which is always false
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * false as the second argument.
     */
    mining(args: [], callback: Callback): void;
    /**
     * Returns client mining hashrate, which is always 0x0
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * 0x0 as the second argument.
     */
    hashrate(args: [], callback: Callback): void;
    gasPrice(args: [], callback: Callback): void;
    /**
     * Returns client saved wallet addresses, which is always zero array
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * [] as the second argument.
     */
    accounts(args: [], callback: Callback): void;
    blockNumber(args: [], callback: Callback): void;
    getBalance(args: [], callback: Callback): void;
}
