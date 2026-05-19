import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  DataIntegrityCredentialFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol,
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  AutoAcceptCredential,
  AutoAcceptProof,
  BasicMessagesModule,
  ConnectionsModule,
  CredentialsModule,
  DidsModule,
  DifPresentationExchangeProofFormatService,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  MediationRecipientModule,
  MediatorPickupStrategy,
  PeerDidResolver,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
  WebDidResolver,
  X509Module,
} from '@credo-ts/core'
import { IndyVdrAnonCredsRegistry, IndyVdrModule, IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { OpenId4VcHolderModule } from '@credo-ts/openid4vc'
import { PushNotificationsApnsModule, PushNotificationsFcmModule } from '@credo-ts/push-notifications'
import { WebVhAnonCredsRegistry, WebvhDidResolver } from '@credo-ts/webvh'
import { useAgent } from '@credo-ts/react-hooks'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'

// Kanon DID Module for Ethereum-based DIDs
import {
  EthereumLedgerService,
  KanonAnonCredsRegistry,
  KanonDIDRegistrar,
  KanonDIDResolver,
  KanonModule,
  KanonModuleConfig,
} from 'kanon-react-native'

// Ajna Workflow Module for DIDComm-based state machines
import { WorkflowModule } from '@ajna-inc/workflow'

// Ajna WebRTC Module for DIDComm-based video calls
import { WebRTCModule } from '@ajna-inc/webrtc'

// 2060 User Profile Module for DIDComm user-profile exchange (wire-compatible
// with the ACA-Py `user_profile_protocol` plugin running in CRMS).
import { UserProfileModule } from '@2060.io/credo-ts-didcomm-user-profile'

// Ajna OpenBadges Module — OBv3 (OpenBadgeCredential / AchievementCredential)
// issuance/verification with mobile-safe ECDSA/Ed25519 cryptosuites. Used for
// credentials that genuinely have OBv3 type, not for arbitrary JSON-LD W3C
// VCs (those go to JsonLdCredentialModule below).
import {
  OpenBadgesModule,
  OpenBadgesCredentialFormatService,
  OpenBadgesProofFormatService,
} from '@ajna-inc/openbadges'

// Generic W3C JSON-LD credential storage. Holds raw JSON without
// class-validator so v1, v2, and DataIntegrityProof all round-trip cleanly.
// This is the proper home for non-OBv3 credentials issued via OID4VCI when
// Credo 0.5's W3cCredentialRecord rejects them at validation time.
import { JsonLdCredentialModule } from '../modules/openid/jsonLd/JsonLdCredentialModule'

export interface WebRTCIceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

interface GetAgentModulesOptions {
  indyNetworks: IndyVdrPoolConfig[]
  mediatorInvitationUrl?: string
  txnCache?: { capacity: number; expiryOffsetMs: number; path?: string }
  webrtcIceServers?: WebRTCIceServer[]
  trustedX509Certificates?: string[]
}

export type BifoldAgent = Agent<ReturnType<typeof getAgentModules>>

/**
 * Constructs the modules to be used in the agent setup
 * @param indyNetworks
 * @param mediatorInvitationUrl determine which mediator to use
 * @param txnCache optional local cache config for indyvdr
 * @returns modules to be used in agent setup
 */
export function getAgentModules({
  indyNetworks,
  mediatorInvitationUrl,
  txnCache,
  webrtcIceServers,
  trustedX509Certificates,
}: GetAgentModulesOptions) {
  const indyCredentialFormat = new LegacyIndyCredentialFormatService()
  const indyProofFormat = new LegacyIndyProofFormatService()

  if (txnCache) {
    indyVdr.setLedgerTxnCache({
      capacity: txnCache.capacity,
      expiry_offset_ms: txnCache.expiryOffsetMs,
      path: txnCache.path,
    })
  }

  // Kanon (Ethereum) configuration for DID resolution
  const ethConfig = new KanonModuleConfig({
    networks: [
      {
        network: 'testnet',
        rpcUrl: 'https://ethereum-sepolia.rpc.subquery.network/public',
        // Dummy private key since we're primarily a resolver, not registrar
        privateKey: '0x00000000002a655b0cca24b8029acb27738fe32d131ceaa9a43fd9929c4e6116',
      },
    ],
  })
  const ledgerService = new EthereumLedgerService(ethConfig)

  return {
    askar: new AskarModule({
      ariesAskar,
    }),
    anoncreds: new AnonCredsModule({
      anoncreds,
      registries: [
        new IndyVdrAnonCredsRegistry(),
        new WebVhAnonCredsRegistry(),
        new KanonAnonCredsRegistry(),
      ],
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks as [IndyVdrPoolConfig],
    }),
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),
    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V1CredentialProtocol({ indyCredentialFormat }),
        new V2CredentialProtocol({
          credentialFormats: [
            indyCredentialFormat,
            new AnonCredsCredentialFormatService(),
            new DataIntegrityCredentialFormatService(),
            new OpenBadgesCredentialFormatService(),
          ],
        }),
      ],
    }),
    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V1ProofProtocol({ indyProofFormat }),
        new V2ProofProtocol({
          proofFormats: [
            indyProofFormat,
            new AnonCredsProofFormatService(),
            new DifPresentationExchangeProofFormatService(),
            new OpenBadgesProofFormatService(),
          ],
        }),
      ],
    }),
    // Kanon module for Ethereum-based DIDs
    kanon: new KanonModule(ethConfig),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl: mediatorInvitationUrl,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    }),
    pushNotificationsFcm: new PushNotificationsFcmModule(),
    pushNotificationsApns: new PushNotificationsApnsModule(),
    openId4VcHolder: new OpenId4VcHolderModule(),
    // Basic messages module for DIDComm messaging
    basicMessages: new BasicMessagesModule(),
    // User profile module (DIDComm https://didcomm.org/user-profile/1.0).
    // autoSendProfile defaults to true, so peers that request our profile get
    // it automatically.
    userProfile: new UserProfileModule(),
    // Workflow module for DIDComm-based state machines
    workflow: new WorkflowModule({
      enableProblemReport: true,
      enablePaymentsEventMapping: false,
      enableAutoDiscoverOnStart: true,
      discoveryTimeoutMs: 30000,
    }),
    // WebRTC module for DIDComm-based video calls
    // ICE servers should be provided via TOKENS.UTIL_WEBRTC_ICE_SERVERS
    // TURN credentials should be stored in environment variables, not committed to code
    webrtc: new WebRTCModule({
      iceServers: webrtcIceServers ?? [
        // Default STUN servers (free, no credentials needed)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      defaultPolicy: 'all',
      defaultTrickle: true,
    }),
    dids: new DidsModule({
      resolvers: [
        new WebvhDidResolver(),
        new WebDidResolver(),
        new JwkDidResolver(),
        new KeyDidResolver(),
        new PeerDidResolver(),
        new KanonDIDResolver(ledgerService),
      ],
      // JwkDidRegistrar / KeyDidRegistrar are required so the OID4VCI
      // credentialBindingResolver can mint a holder DID for the credential request.
      registrars: [new JwkDidRegistrar(), new KeyDidRegistrar(), new KanonDIDRegistrar(ledgerService)],
    }),
    // X.509 trust anchors for verifier flows that require certificate validation
    // (e.g. mDoc reader trust). Optional — the module accepts undefined.
    x509: new X509Module({
      trustedCertificates:
        trustedX509Certificates && trustedX509Certificates.length > 0
          ? (trustedX509Certificates as [string, ...string[]])
          : undefined,
    }),
    // OpenBadges 0.1.14 — only used for credentials with OBv3 type
    // (OpenBadgeCredential / AchievementCredential). Provides the
    // EddsaRdfc2022Cryptosuite for DataIntegrityProof verification (mobile-safe).
    openbadges: new OpenBadgesModule({}),
    // Generic W3C JSON-LD credential storage. Receives every OID4VCI JSON-LD
    // credential that isn't an OBv3 badge.
    jsonLdCredentials: new JsonLdCredentialModule(),
  }
}

interface MyAgentContextInterface {
  loading: boolean
  agent: BifoldAgent
}

export const useAppAgent = useAgent as () => MyAgentContextInterface

export const createLinkSecretIfRequired = async (agent: Agent) => {
  // If we don't have any link secrets yet, we will create a
  // default link secret that will be used for all anoncreds
  // credential requests.
  const linkSecretIds = await agent.modules.anoncreds.getLinkSecretIds()
  if (linkSecretIds.length === 0) {
    await agent.modules.anoncreds.createLinkSecret({
      setAsDefault: true,
    })
  }
}
