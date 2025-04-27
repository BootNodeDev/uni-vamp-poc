// src/hooks/useBalancerPositions.ts
import type { GetUserPoolSharesResponse, PoolShare } from '@/src/types/balancer'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'

const BALANCER_SUBGRAPH_V3 =
  'https://api.studio.thegraph.com/query/75376/balancer-v3-base/version/latest'

const query = gql`
  query GetUserShares($user: String!) {
    poolShares(where: { user: $user }) {
      balance
      pool {
        id
        address
        totalShares
        tokens {
          id
          address
          symbol
          decimals
          balance
          name
        }
      }
    }
  }
`

async function fetchBalancerPositions(userAddress: string) {
  const data = await request<GetUserPoolSharesResponse>(BALANCER_SUBGRAPH_V3, query, {
    user: userAddress.toLowerCase(),
  })

  return data.poolShares.filter((s: PoolShare) => Number(s.balance) > 0)
}

export function useBalancerPositions(userAddress: string) {
  return useQuery({
    queryKey: ['balancer-v3-positions', userAddress],
    queryFn: () => fetchBalancerPositions(userAddress),
    enabled: !!userAddress,
    staleTime: Number.POSITIVE_INFINITY, // Never mark data as stale
    gcTime: Number.POSITIVE_INFINITY, // Keep data in cache forever
  })
}
