import type { Agent } from '@credo-ts/core'
import { ConnectionRepository } from '@credo-ts/core'

/**
 * One-shot DIDComm Feature Discovery for a peer connection.
 *
 * Runs `agent.discovery.queryFeatures` ONCE per connection, caches the
 * disclosed protocol IDs in the connection's metadata, and returns the set.
 * Subsequent calls read from cache without re-probing — peer protocol
 * support doesn't change inside a connection's lifetime.
 *
 * The cache key holds the raw feature IDs (e.g.
 * `https://didcomm.org/workflow/1.0/discover`,
 * `https://didcomm.org/user-profile/1.0/request-profile`), not protocol-base
 * URIs, so callers do a prefix check via `hasProtocol`.
 */

const METADATA_KEY = 'disclosed-protocols'
const DISCOVERY_TIMEOUT_MS = 8000

interface DisclosedProtocols {
  features: string[]
  probedAt: string
}

const inflight = new Map<string, Promise<string[]>>()

const runDiscovery = async (agent: Agent, connectionId: string): Promise<string[]> => {
  try {
    const result = await agent.discovery.queryFeatures({
      connectionId,
      protocolVersion: 'v2',
      // '*' returns every feature of the requested type the peer discloses.
      // We only need protocols (not goal-codes) for now.
      queries: [{ featureType: 'protocol', match: '*' }],
      awaitDisclosures: true,
      awaitDisclosuresTimeoutMs: DISCOVERY_TIMEOUT_MS,
    })
    return (result.features ?? [])
      .map((f) => f.id)
      .filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

/**
 * Get the set of feature IDs the peer at `connectionId` has disclosed,
 * probing once on first call and caching for the connection's lifetime.
 *
 * Only positive results (probe returned any feature) are persisted. A failed
 * probe doesn't poison the cache — next caller retries.
 */
export const getDisclosedProtocols = async (
  agent: Agent,
  connectionId: string
): Promise<string[]> => {
  const connection = await agent.connections.findById(connectionId)
  if (!connection) return []

  const cached = connection.metadata.get<DisclosedProtocols>(METADATA_KEY)
  if (cached?.features && cached.features.length > 0) {
    return cached.features
  }

  // Coalesce concurrent requests for the same connection.
  const pending = inflight.get(connectionId)
  if (pending) return pending

  const promise = (async () => {
    const features = await runDiscovery(agent, connectionId)
    if (features.length > 0) {
      connection.metadata.set(METADATA_KEY, {
        features,
        probedAt: new Date().toISOString(),
      } satisfies DisclosedProtocols)
      try {
        const repo = agent.context.dependencyManager.resolve(ConnectionRepository)
        await repo.update(agent.context, connection)
      } catch {
        // Persisting the cache is best-effort; in-memory result still helps.
      }
    }
    return features
  })()

  inflight.set(connectionId, promise)
  try {
    return await promise
  } finally {
    inflight.delete(connectionId)
  }
}

/**
 * True if any disclosed feature ID starts with `protocolUri`.
 *
 * @param features list returned by `getDisclosedProtocols`
 * @param protocolUri base URI like `https://didcomm.org/workflow/1.0`
 */
export const hasProtocol = (features: readonly string[], protocolUri: string): boolean =>
  features.some((id) => id.startsWith(protocolUri))
