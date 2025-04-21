// networks.config.ts
/**
 * This file contains the configuration for the networks used in the application.
 *
 * @packageDocumentation
 */
import { http, type Transport } from 'viem'
import { base } from 'viem/chains'

import { env } from '@/src/env'

const prodChains = [base] as const
export const chains = prodChains
export type ChainsIds = (typeof chains)[number]['id']

type RestrictedTransports = Record<ChainsIds, Transport>
export const transports: RestrictedTransports = {
  [base.id]: http(env.PUBLIC_RPC_BASE),
}
