/**
 * Home page for Balancer to Uniswap v4 migration
 */
import { BalancerUserPositions } from '@/src/components/BalancerUserPositions'
import UniswapV4Deposit from '@/src/components/UniswapV4Deposit'
import { ConnectWalletButton } from '@/src/providers/Web3Provider'
import { Title } from '@bootnodedev/db-ui-toolkit'
import styled from 'styled-components'
import { useAccount } from 'wagmi'

/**
 * A styled container for the home page
 */
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`

/**
 * A header component for the page
 */
const Header = styled.header`
  margin-bottom: 2rem;
  text-align: center;
`

/**
 * Styled component for the wallet connection container
 */
const ConnectWalletContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  max-width: 600px;
  margin: 4rem auto;
  text-align: center;
  background-color: var(--theme-background-light, #f9f9f9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
`

const SectionDivider = styled.div`
  margin: 3rem 0;
  border-top: 1px solid var(--theme-border-color-light, #f0f0f0);
`

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--theme-text-color, #333);
`

/**
 * Main home component showing user's positions
 */
export const Home = () => {
  const { address } = useAccount()

  if (!address) {
    return (
      <ConnectWalletContainer>
        <p>Connect your wallet to view your positions</p>
        <ConnectWalletButton />
      </ConnectWalletContainer>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Balancer to Uniswap v4 Migration</Title>
        <p>View your positions and migrate between protocols</p>
      </Header>

      <SectionTitle>Your Balancer Positions</SectionTitle>
      <BalancerUserPositions userAddress={address} />

      <SectionDivider />

      <UniswapV4Deposit />
    </Container>
  )
}
