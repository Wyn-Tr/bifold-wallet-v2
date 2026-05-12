import { OpenIdVpError } from './errors'

type DescriptorSelection = Record<string, { id: string; claimFormat?: string }>

type PreflightArgs = {
  inputDescriptors: Array<{ id: string; format?: Record<string, unknown> }>
  selectedCredentials: DescriptorSelection
  verifierVpFormats?: Record<string, unknown>
  holderCapabilities: {
    supportsDidKey: boolean
    supportsDidJwk: boolean
    supportedSigningAlgs: string[]
    supportsJwkBinding: boolean
  }
}

const extractAllowedVpAlgs = (vpFormats?: Record<string, unknown>): string[] => {
  if (!vpFormats) return []
  const out: string[] = []
  for (const [key, value] of Object.entries(vpFormats)) {
    const algs = (value as { alg_values_supported?: string[] })?.alg_values_supported || []
    if (key.includes('jwt') || key.includes('sd-jwt')) {
      out.push(...algs)
    }
  }
  return [...new Set(out)]
}

export const preflightVpRequest = (args: PreflightArgs): OpenIdVpError[] => {
  const issues: OpenIdVpError[] = []

  for (const descriptor of args.inputDescriptors) {
    const selected = args.selectedCredentials[descriptor.id]
    if (!selected) {
      issues.push(
        new OpenIdVpError('descriptor_missing_selection', `No selected credential for descriptor ${descriptor.id}`, {
          descriptorId: descriptor.id,
        })
      )
    }
  }

  const allowedVpAlgs = extractAllowedVpAlgs(args.verifierVpFormats)
  if (allowedVpAlgs.length > 0) {
    const overlap = allowedVpAlgs.some((alg) => args.holderCapabilities.supportedSigningAlgs.includes(alg))
    if (!overlap) {
      issues.push(
        new OpenIdVpError('vp_alg_incompatible', 'No compatible VP signing algorithm with verifier', {
          verifier: allowedVpAlgs,
          wallet: args.holderCapabilities.supportedSigningAlgs,
        })
      )
    }
  }

  if (!args.holderCapabilities.supportsDidKey && !args.holderCapabilities.supportsDidJwk && !args.holderCapabilities.supportsJwkBinding) {
    issues.push(new OpenIdVpError('holder_binding_unavailable', 'No holder binding method available in wallet'))
  }

  return issues
}
