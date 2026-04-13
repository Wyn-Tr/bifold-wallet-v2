import { BasicMessageRecord, ConnectionRecord, CredentialExchangeRecord, ProofExchangeRecord } from '@credo-ts/core'

import { MobileWorkflowService } from '../services/WorkflowService'

import { BifoldAgent } from './agent'

interface DateRecord {
  createdAt: Date
  updatedAt?: Date
}

interface ConnectionWithMessages {
  conn: ConnectionRecord
  msgs: DateRecord[]
}

interface ConnectionWithLatestMessage {
  conn: ConnectionRecord
  latestMsg: DateRecord
}

/**
 * Function to fetch contacts (connections) in order of latest chat message without using hooks
 * @param agent - Credo agent
 * @param connections - Connection records to sort
 * @param workflowService - Optional workflow service to include workflow instances in sorting
 * @returns ConnectionRecord[] sorted by most recent message
 */
export const fetchContactsByLatestMessage = async (
  agent: BifoldAgent,
  connections: ConnectionRecord[],
  workflowService?: MobileWorkflowService
): Promise<ConnectionRecord[]> => {
  const connectionsWithMessages = await Promise.all<ConnectionWithMessages>(
    connections.map(
      async (conn: ConnectionRecord): Promise<ConnectionWithMessages> => {
        const msgs: DateRecord[] = [
          ...(await agent.basicMessages.findAllByQuery({ connectionId: conn.id })),
          ...(await agent.proofs.findAllByQuery({ connectionId: conn.id })),
          ...(await agent.credentials.findAllByQuery({ connectionId: conn.id })),
        ]

        // Include workflow instances if service is available
        if (workflowService) {
          try {
            const instances = await workflowService.listInstances(conn.id)
            msgs.push(...instances)
          } catch {
            // Workflow module may not be available — ignore
          }
        }

        return { conn, msgs }
      }
    )
  )

  const connectionsWithLatestMessage: ConnectionWithLatestMessage[] = connectionsWithMessages.map((pair) => {
    return {
      conn: pair.conn,
      latestMsg: pair.msgs.reduce(
        (acc, cur) => {
          const accDate = acc.updatedAt || acc.createdAt
          const curDate = cur.updatedAt || cur.createdAt
          return accDate > curDate ? acc : cur
        },
        // Initial value if no messages exist for this connection is a placeholder with the date the connection was created
        { createdAt: pair.conn.createdAt } as DateRecord
      ),
    }
  })

  return connectionsWithLatestMessage
    .sort(
      (a, b) =>
        new Date(b.latestMsg.updatedAt || b.latestMsg.createdAt).valueOf() -
        new Date(a.latestMsg.updatedAt || a.latestMsg.createdAt).valueOf()
    )
    .map((pair) => pair.conn)
}
