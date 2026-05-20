import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { JsonLdCredentialRepository } from './JsonLdCredentialRepository'

/**
 * Registers a singleton `JsonLdCredentialRepository` on the agent's DI
 * container. The bridge / provider / details screen resolve it via
 * `agent.dependencyManager.resolve(JsonLdCredentialRepository)`.
 *
 * No API class — repositories are accessed directly. Tags are read from
 * `JsonLdCredentialRecord.getTags()` for query-by-id support.
 */
export class JsonLdCredentialModule implements Module {
  public register(dependencyManager: DependencyManager) {
    const repository = JsonLdCredentialRepository.fromDependencyManager(dependencyManager)
    dependencyManager.registerInstance(JsonLdCredentialRepository, repository)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(_agentContext: AgentContext): Promise<void> {
    // Nothing to initialize; storage backend is provided by AskarModule.
  }
}
