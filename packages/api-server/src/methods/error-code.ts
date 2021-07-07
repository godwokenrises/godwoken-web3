//  Error code from JSON-RPC 2.0 spec
//  reference: http://www.jsonrpc.org/specification#error_object
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export const METHOD_NOT_SUPPORT = -32000;

// WEB3_ERROR is pretty generalize error
// later when we have more time, we can split into more detail one
export const WEB3_ERROR = -32001;

export const GW_RPC_REQUEST_ERROR = -32002;