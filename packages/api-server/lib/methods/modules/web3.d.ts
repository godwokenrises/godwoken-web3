import { Callback } from '../types';
export declare class Web3 {
    constructor();
    /**
     * Returns the current client version
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * client version as the second argument
     */
    clientVersion(args: [], callback: Callback): void;
    /**
     * Returns Keccak-256 (not the standardized SHA3-256) of the given data
     * @param  {Array<string>} [params] The data to convert into a SHA3 hash
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * Keccak-256 hash of the given data as the second argument
     */
    sha3(args: string[], callback: Callback): void;
}
