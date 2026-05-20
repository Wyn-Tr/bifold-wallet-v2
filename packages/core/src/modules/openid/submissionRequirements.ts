import { OpenIdVpError } from './errors'

type Requirement = {
  name?: string
  rule: 'all' | 'pick'
  count?: number
  min?: number
  max?: number
  from?: string
  from_nested?: Requirement[]
}

type DescriptorMap = Record<string, { id: string }>

export const validateSubmissionRequirements = (
  requirements: Requirement[] | undefined,
  selectedByDescriptorId: DescriptorMap,
  descriptorGroupMap: Record<string, string[]>
): OpenIdVpError[] => {
  const errors: OpenIdVpError[] = []
  if (!requirements || requirements.length === 0) {
    return errors
  }

  const evalReq = (req: Requirement): number => {
    if (req.from_nested?.length) {
      const nestedCounts = req.from_nested.map(evalReq)
      const satisfied = nestedCounts.filter((v) => v > 0).length
      if (req.rule === 'all' && satisfied !== req.from_nested.length) {
        errors.push(new OpenIdVpError('submission_requirements_unsatisfied', `Nested requirement ${req.name || ''} failed (all)`))
      }
      if (req.rule === 'pick') {
        const min = req.min ?? req.count ?? 1
        const max = req.max ?? Number.MAX_SAFE_INTEGER
        if (satisfied < min || satisfied > max) {
          errors.push(
            new OpenIdVpError('submission_requirements_unsatisfied', `Nested requirement ${req.name || ''} failed (pick ${min}-${max})`)
          )
        }
      }
      return satisfied
    }

    const ids = req.from ? descriptorGroupMap[req.from] || [] : []
    const selectedCount = ids.filter((id) => !!selectedByDescriptorId[id]).length

    if (req.rule === 'all' && selectedCount !== ids.length) {
      errors.push(
        new OpenIdVpError('submission_requirements_unsatisfied', `Requirement ${req.name || req.from || ''} failed (all)`, {
          selected: selectedCount,
          required: ids.length,
        })
      )
    }

    if (req.rule === 'pick') {
      const min = req.min ?? req.count ?? 1
      const max = req.max ?? Number.MAX_SAFE_INTEGER
      if (selectedCount < min || selectedCount > max) {
        errors.push(
          new OpenIdVpError('submission_requirements_unsatisfied', `Requirement ${req.name || req.from || ''} failed (pick ${min}-${max})`, {
            selected: selectedCount,
            min,
            max,
          })
        )
      }
    }

    return selectedCount
  }

  requirements.forEach(evalReq)
  return errors
}
