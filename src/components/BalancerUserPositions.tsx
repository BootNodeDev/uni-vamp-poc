import { useBalancerPositions } from '@/src/hooks/useBalancerPositions'
import { useExitBalancerPool } from '@/src/hooks/useExitBalancerPool'
import { useUniswapV4Deposit } from '@/src/hooks/useUniswapV4Deposit'
import { useV4Pool } from '@/src/hooks/useUniswapV4Pool'
import type { PoolShare, PoolToken } from '@/src/types/balancer'
import { calculateUserTokenShares } from '@/src/utils/getUserPoolShares'
import { Button, Card, Title } from '@bootnodedev/db-ui-toolkit'
import { Token } from '@uniswap/sdk-core'
import { useState } from 'react'
import styled from 'styled-components'
import { parseUnits } from 'viem'
import { base } from 'viem/chains'
import { useAccount } from 'wagmi'

const PositionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
`

const PositionCard = styled(Card)`
  padding: 1.5rem;
  border: 1px solid var(--theme-border-color, #e0e0e0);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
`

const PositionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--theme-border-color-light, #f0f0f0);
`

const PositionName = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`

const PoolLink = styled.a`
  color: inherit;
  text-decoration: none;
  display: flex;
  align-items: center;
  
  &:hover {
    text-decoration: underline;
  }
`

const TokenList = styled.div`
  margin-top: 0.5rem;
  width: 100%;
`

const TokenItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--theme-border-color-light, #f0f0f0);
  
  &:last-child {
    border-bottom: none;
  }
`

const TokenSymbol = styled.span`
  font-weight: 500;
  font-size: 1.1rem;
`

const TokenBalance = styled.div`
  display: flex;
  align-items: center;
  text-align: right;
`

const TokenBalanceAmount = styled.span`
  font-weight: 500;
  font-size: 1.1rem;
`

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`

const ActionButton = styled(Button)`
  flex: 1;
  padding: 0.75rem;
  font-weight: 500;
`

const StatusMessage = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
  background-color: var(--theme-background-light, #f9f9f9);
`

const LoadingState = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--theme-text-secondary, #666);
`

const ErrorState = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--theme-error, #ff4d4f);
`

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--theme-text-secondary, #666);
`

const formatTokenBalance = (balance: string, decimals: number) => {
  if (!balance || !decimals) return '0'
  const value = Number.parseFloat(balance)
  if (value === 0) return '0'

  // Format with appropriate precision based on the size of the number
  if (value < 0.001) return '<0.001'
  if (value < 1) return value.toFixed(4)
  if (value < 1000) return value.toFixed(2)
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const getPoolExplorerUrl = (poolId: string) => {
  return `https://app.balancer.fi/#/base/pool/${poolId}`
}

const PositionActions = ({
  position,
  tokens,
  amounts,
  refreshBalancerPositions,
}: {
  position: PoolShare
  tokens: PoolToken[]
  amounts: Record<string, number>
  refreshBalancerPositions: () => void
}) => {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const { address } = useAccount()
  const { removeOne } = useExitBalancerPool()

  const token0 = new Token(
    base.id,
    tokens[0].address as `0x${string}`,
    tokens[0].decimals,
    tokens[0].symbol,
    tokens[0].name,
  )

  const token1 = new Token(
    base.id,
    tokens[1].address as `0x${string}`,
    tokens[1].decimals,
    tokens[1].symbol,
    tokens[1].name,
  )

  const { data: pool } = useV4Pool({
    tokenA: {
      token: token0,
      amount: parseUnits(amounts[tokens[0].symbol].toString(), tokens[0].decimals),
    },
    tokenB: {
      token: token1,
      amount: parseUnits(amounts[tokens[1].symbol].toString(), tokens[1].decimals),
    },
  })

  const sendTx = useUniswapV4Deposit(
    pool,
    { token: token0, amount: parseUnits(amounts[tokens[0].symbol].toString(), tokens[0].decimals) },
    { token: token1, amount: parseUnits(amounts[tokens[1].symbol].toString(), tokens[1].decimals) },
  )

  const handleExit = async () => {
    if (!address) return

    try {
      setStatus('migrating')
      setError(null)

      // Remove liquidity from Balancer
      const receipt = await removeOne({
        address: position.pool.address as `0x${string}`,
        decimals: 18,
        rawAmount: parseUnits(position.balance, 18),
      })

      if (receipt.status === 'success') {
        // Deposit liquidity into Uniswap V4
        const receipt = await sendTx()

        if (receipt) {
          setTxHash(receipt.transactionHash)
          setStatus('success')
          refreshBalancerPositions()
        } else {
          throw new Error('Transaction reverted')
        }
      } else {
        throw new Error('Transaction reverted')
      }
    } catch (err) {
      console.error('Error exiting pool:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'migrating':
        return 'Migrating pool... Please sign the transaction in your wallet.'
      case 'success':
        return (
          <>
            Successfully exited the pool!{' '}
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            )}
          </>
        )
      case 'error':
        return `Error: ${error || 'Unknown error'}`
      default:
        return null
    }
  }

  const statusMessage = getStatusMessage()

  return (
    <>
      <ButtonContainer>
        <ActionButton
          $variant="secondary"
          onClick={handleExit}
          disabled={status === 'migrating'}
        >
          {status === 'migrating' ? 'Migrating...' : 'Migrate liquidity to Uniswap V4'}
        </ActionButton>
      </ButtonContainer>

      {statusMessage && <StatusMessage>{statusMessage}</StatusMessage>}
    </>
  )
}

export const BalancerUserPositions = ({
  userAddress,
}: {
  userAddress: string
}) => {
  const {
    data: positions,
    isLoading,
    error,
    refetch: refreshBalancerPositions,
  } = useBalancerPositions(userAddress)
  if (isLoading) {
    return <LoadingState>Loading your Balancer positions...</LoadingState>
  }

  if (error) {
    console.error(error)
    return <ErrorState>Error loading positions. Please try again.</ErrorState>
  }

  if (!positions || positions.length === 0) {
    return <EmptyState>You don't have any Balancer positions on Base.</EmptyState>
  }

  // Calculate all token shares upfront - using the updated version that returns an object
  const userTokenShares = positions.map((s: PoolShare) =>
    calculateUserTokenShares(Number(s.balance), Number(s.pool.totalShares), s.pool.tokens),
  )

  // Create a lookup function to easily find token amounts - now simpler since we already have an object
  const getTokenAmount = (positionIndex: number, tokenSymbol: string, decimals: number) => {
    const amount = userTokenShares[positionIndex]?.[tokenSymbol] ?? 0
    return formatTokenBalance(amount.toString(), decimals)
  }

  return (
    <PositionsContainer>
      <Title>Your Balancer Positions</Title>
      {positions.map((position: PoolShare, i) => (
        <PositionCard key={position.pool.id}>
          <PositionHeader>
            <PositionName>
              <PoolLink
                href={getPoolExplorerUrl(position.pool.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pool #{position.pool.id.slice(0, 8)}
              </PoolLink>
            </PositionName>
          </PositionHeader>

          <TokenList>
            {position.pool.tokens.map((token) => (
              <TokenItem key={token.address}>
                <TokenSymbol>{token.symbol}</TokenSymbol>
                <TokenBalance>
                  <TokenBalanceAmount>
                    {getTokenAmount(i, token.symbol, token.decimals)}
                  </TokenBalanceAmount>
                </TokenBalance>
              </TokenItem>
            ))}
          </TokenList>
          <PositionActions
            position={position}
            tokens={position.pool.tokens}
            amounts={userTokenShares[i]}
            refreshBalancerPositions={refreshBalancerPositions}
          />
        </PositionCard>
      ))}
    </PositionsContainer>
  )
}
