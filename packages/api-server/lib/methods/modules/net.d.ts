import { Callback } from '../types';
export declare class Net {
    constructor();
    /**
     * Returns the current net version
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * net version as the second argument
     */
    version(args: [], callback: Callback): void;
    /**
     * Returns the current peer nodes number, which is always 0 since godwoken is not emplementing p2p network
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * current peer nodes number as the second argument
     */
    peerCount(args: [], callback: Callback): void;
    /**
     * Returns if the client is currently listening
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * boolean as the second argument
     */
    listening(args: [], callback: Callback): void;
}
