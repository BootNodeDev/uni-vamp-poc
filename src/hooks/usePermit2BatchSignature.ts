import { useWeb3Status } from '@/src/hooks/useWeb3Status'
import { Web3Provider } from '@ethersproject/providers'
import { useQuery } from '@tanstack/react-query'
import { AllowanceTransfer, MaxUint160, PERMIT2_ADDRESS } from '@uniswap/permit2-sdk'
import { useCallback } from 'react'

type UsePermit2BatchSignatureParams = {
  tokens: `0x${string}`[]
  spender: `0x${string}`
}

const provider = new Web3Provider(window.ethereum)

export function usePermit2BatchSignature({ tokens, spender }: UsePermit2BatchSignatureParams) {
  const { walletClient, readOnlyClient, address: user, walletChainId: chainId } = useWeb3Status()

  const { data, isLoading, error } = useQuery({
    queryKey: ['permit2-batch-signature', user, tokens, spender, chainId],
    enabled: Boolean(walletClient && readOnlyClient && user && chainId),
    queryFn: async () => {
      if (!walletClient || !readOnlyClient || !user || !chainId) {
        throw new Error('Missing dependencies')
      }

      const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 // 30 días
      const sigDeadline = expiration

      const details = await Promise.all(
        tokens.map(async (token) => {
          const allowance = await readOnlyClient.readContract({
            address: PERMIT2_ADDRESS,
            abi: [
              {
                name: 'allowance',
                type: 'function',
                stateMutability: 'view',
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'token', type: 'address' },
                  { name: 'spender', type: 'address' },
                ],
                outputs: [
                  {
                    components: [
                      { name: 'amount', type: 'uint160' },
                      { name: 'expiration', type: 'uint48' },
                      { name: 'nonce', type: 'uint48' },
                    ],
                    name: 'details',
                    type: 'tuple',
                  },
                ],
              },
            ],
            functionName: 'allowance',
            args: [user, token, spender],
          })

          return {
            token,
            amount: MaxUint160.toString(),
            expiration,
            nonce: allowance.nonce,
          }
        }),
      )

      const permitBatch = {
        details,
        spender,
        sigDeadline,
      }

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permitBatch,
        PERMIT2_ADDRESS,
        chainId,
      )

      return {
        owner: user,
        permitBatch,
        toSign: {
          domain,
          types,
          values,
        },
      }
    },
  })

  const sign = useCallback(() => {
    if (!data) return null

    const signer = provider.getSigner()
    try {
      return signer._signTypedData(data.toSign.domain, data.toSign.types, data.toSign.values)
    } catch (error) {
      console.error('Error signing permit2 batch signature', error)
      return null
    }
  }, [data])

  return { data, isLoading, error, sign }
}
