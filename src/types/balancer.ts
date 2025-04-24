export interface Token {
  address: string
  symbol: string
  decimals: number
  name: string
}

export interface PoolToken {
  id: string
  address: string
  symbol: string
  decimals: number
  balance: string
  name: string
}

export interface Pool {
  id: string
  address: string
  tokens: PoolToken[]
  totalShares: string
}

export interface PoolShare {
  id: string
  balance: string
  pool: Pool
}

export interface GetUserPoolSharesResponse {
  poolShares: PoolShare[]
}
