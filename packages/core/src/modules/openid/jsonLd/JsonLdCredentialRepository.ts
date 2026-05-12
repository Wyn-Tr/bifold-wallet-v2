/*
 * Repository for JsonLdCredentialRecord. Constructed manually (no
 * `@injectable`/`@inject` decorators) because the host TypeScript project
 * doesn't enable `experimentalDecorators`. Registration happens in
 * `JsonLdCredentialModule.register`.
 */

import {
  EventEmitter,
  InjectionSymbols,
  Repository,
  type StorageService,
} from '@credo-ts/core'
import type { DependencyManager } from '@credo-ts/core'

import { JsonLdCredentialRecord } from './JsonLdCredentialRecord'

export class JsonLdCredentialRepository extends Repository<JsonLdCredentialRecord> {
  public constructor(
    storageService: StorageService<JsonLdCredentialRecord>,
    eventEmitter: EventEmitter
  ) {
    super(JsonLdCredentialRecord, storageService, eventEmitter)
  }

  /**
   * Build a `JsonLdCredentialRepository` from the agent's dependency manager
   * by resolving its dependencies imperatively. Used by the module's
   * `register` so we don't need decorator-based injection.
   */
  public static fromDependencyManager(dm: DependencyManager): JsonLdCredentialRepository {
    const storageService = dm.resolve<StorageService<JsonLdCredentialRecord>>(
      InjectionSymbols.StorageService
    )
    const eventEmitter = dm.resolve(EventEmitter)
    return new JsonLdCredentialRepository(storageService, eventEmitter)
  }
}
