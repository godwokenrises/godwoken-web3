export type Error = {
    message: string
} | null

export type SyningStatus = false | { 
    startingBlock: number
    currentBlock: number
    highestBlock: number
}

export type Response = number | string | boolean | SyningStatus | Array<string>

export type Callback =  (err: Error, res?: any | Response) => {}
