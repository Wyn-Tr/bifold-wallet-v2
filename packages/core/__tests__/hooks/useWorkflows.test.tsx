/**
 * useWorkflows Hook Tests
 *
 * Tests for useWorkflows, useWorkflowTemplates, and usePendingWorkflows hooks.
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'

import { useWorkflows, useWorkflowTemplates, usePendingWorkflows } from '../../src/hooks/useWorkflows'
import { BasicAppContext } from '../helpers/app'
import {
  mockWorkflowInstances,
  mockWorkflowTemplates,
  createMockWorkflowInstance,
  createMockWorkflowTemplate,
} from '../fixtures/workflow-fixtures'

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

// Mock useAgent
const mockAgent = {
  modules: {
    workflow: {},
  },
  events: {
    on: jest.fn(),
    off: jest.fn(),
  },
}

jest.mock('@credo-ts/react-hooks', () => ({
  useAgent: jest.fn(() => ({ agent: mockAgent })),
}))

// Mock MobileWorkflowService
const mockService = {
  isAvailable: true,
  listInstances: jest.fn(),
  listTemplates: jest.fn(),
  start: jest.fn(),
  discoverTemplates: jest.fn(),
  getTemplate: jest.fn(),
  ensureTemplate: jest.fn(),
  getPendingWorkflows: jest.fn(),
}

jest.mock('../../src/services/WorkflowService', () => ({
  MobileWorkflowService: jest.fn(() => mockService),
}))

// Mock useWorkflowEvents
jest.mock('../../src/hooks/useWorkflowEvents', () => ({
  useWorkflowEvents: jest.fn(),
}))

// Mock useStore
const mockStore = {
  authentication: {
    didAuthenticate: false,
  },
}

jest.mock('../../src/contexts/store', () => ({
  useStore: jest.fn(() => [mockStore]),
}))

// Mock AppState
const mockAppStateSubscription = {
  remove: jest.fn(),
}

jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
  return mockAppStateSubscription
})

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BasicAppContext>{children}</BasicAppContext>
)

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: useWorkflows
// ═══════════════════════════════════════════════════════════════════════════════

describe('useWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockService.listInstances.mockResolvedValue([])
    mockService.start.mockResolvedValue(createMockWorkflowInstance())
    // Reset mocks
    // Reset AppState.currentState
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      writable: true,
    })
  })

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      mockService.listInstances.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.instances).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should fetch instances on mount', async () => {
      const instances = [mockWorkflowInstances.started, mockWorkflowInstances.inProgress]
      mockService.listInstances.mockResolvedValue(instances)

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockService.listInstances).toHaveBeenCalled()
      expect(result.current.instances).toEqual(instances)
    })

    it('should return isAvailable from service', async () => {
      mockService.isAvailable = true

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAvailable).toBe(true)
    })
  })

  describe('Filtering', () => {
    it('should filter instances by connectionId when provided', async () => {
      const instances = [mockWorkflowInstances.started]
      mockService.listInstances.mockResolvedValue(instances)

      const { result } = renderHook(() => useWorkflows('test-connection-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockService.listInstances).toHaveBeenCalledWith('test-connection-1')
    })

    it('should call listInstances without filter when connectionId is undefined', async () => {
      mockService.listInstances.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockService.listInstances).toHaveBeenCalledWith(undefined)
    })
  })

  describe('Error Handling', () => {
    it('should set error state on fetch failure', async () => {
      const error = new Error('Network error')
      mockService.listInstances.mockRejectedValue(error)

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toEqual(error)
      expect(result.current.instances).toEqual([])
    })
  })

  describe('refresh()', () => {
    it('should re-fetch instances', async () => {
      const initialInstances = [mockWorkflowInstances.started]
      const updatedInstances = [mockWorkflowInstances.started, mockWorkflowInstances.inProgress]

      // Use mockResolvedValue for initial calls (multiple effects trigger refresh)
      // then switch to updatedInstances for the explicit refresh call
      mockService.listInstances.mockResolvedValue(initialInstances)

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.instances).toEqual(initialInstances)

      mockService.listInstances.mockResolvedValue(updatedInstances)

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.instances).toEqual(updatedInstances)
    })

    it('should set loading state during refresh', async () => {
      mockService.listInstances.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 50))
      )

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start refresh
      act(() => {
        result.current.refresh()
      })

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('start()', () => {
    it('should start a new workflow instance', async () => {
      const newInstance = createMockWorkflowInstance({ id: 'new-instance' })
      mockService.start.mockResolvedValue(newInstance)
      mockService.listInstances.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const params = {
        templateId: 'test-template',
        connectionId: 'test-connection',
      }

      await act(async () => {
        await result.current.start(params)
      })

      expect(mockService.start).toHaveBeenCalledWith(params)
    })

    it('should refresh list after starting workflow', async () => {
      const newInstance = createMockWorkflowInstance()
      mockService.start.mockResolvedValue(newInstance)
      mockService.listInstances.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialCallCount = mockService.listInstances.mock.calls.length

      await act(async () => {
        await result.current.start({
          templateId: 'test-template',
          connectionId: 'test-connection',
        })
      })

      // Should have called listInstances again after start
      expect(mockService.listInstances.mock.calls.length).toBeGreaterThan(initialCallCount)
    })

    it('should return instance from start', async () => {
      const newInstance = createMockWorkflowInstance({ id: 'returned-instance' })
      mockService.start.mockResolvedValue(newInstance)
      mockService.listInstances.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let returnedInstance
      await act(async () => {
        returnedInstance = await result.current.start({
          templateId: 'test-template',
          connectionId: 'test-connection',
        })
      })

      expect(returnedInstance).toEqual(newInstance)
    })
  })

  describe('Auto-refresh on App Foreground', () => {
    it('should subscribe to AppState changes', async () => {
      mockService.listInstances.mockResolvedValue([])

      renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {})

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should cleanup AppState subscription on unmount', async () => {
      mockService.listInstances.mockResolvedValue([])

      const { unmount } = renderHook(() => useWorkflows(), { wrapper })

      await waitFor(() => {})

      unmount()

      expect(mockAppStateSubscription.remove).toHaveBeenCalled()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: useWorkflowTemplates
// ═══════════════════════════════════════════════════════════════════════════════

describe('useWorkflowTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockService.listTemplates.mockResolvedValue([])
    mockService.discoverTemplates.mockResolvedValue([])
    mockService.getTemplate.mockResolvedValue(null)
    mockService.ensureTemplate.mockResolvedValue(null)
  })

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      mockService.listTemplates.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.templates).toEqual([])
    })

    it('should fetch templates on mount', async () => {
      const templates = [mockWorkflowTemplates.credentialIssuance, mockWorkflowTemplates.proofRequest]
      mockService.listTemplates.mockResolvedValue(templates)

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockService.listTemplates).toHaveBeenCalled()
      expect(result.current.templates).toEqual(templates)
    })
  })

  describe('discoverTemplates()', () => {
    it('should discover templates for connection', async () => {
      const discovered = [createMockWorkflowTemplate()]
      mockService.discoverTemplates.mockResolvedValue(discovered)
      mockService.listTemplates.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.discoverTemplates('connection-1')
      })

      expect(mockService.discoverTemplates).toHaveBeenCalledWith('connection-1', undefined)
    })

    it('should pass options to discoverTemplates', async () => {
      mockService.discoverTemplates.mockResolvedValue([])
      mockService.listTemplates.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const options = { templateId: 'specific-template', templateVersion: '1.0.0' }

      await act(async () => {
        await result.current.discoverTemplates('connection-1', options)
      })

      expect(mockService.discoverTemplates).toHaveBeenCalledWith('connection-1', options)
    })

    it('should refresh templates after discovery', async () => {
      mockService.discoverTemplates.mockResolvedValue([])
      mockService.listTemplates.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const callCountBefore = mockService.listTemplates.mock.calls.length

      await act(async () => {
        await result.current.discoverTemplates('connection-1')
      })

      expect(mockService.listTemplates.mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  describe('getTemplate()', () => {
    it('should get template by id', async () => {
      const template = createMockWorkflowTemplate({ templateId: 'test-template' })
      mockService.getTemplate.mockResolvedValue(template)
      mockService.listTemplates.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let fetchedTemplate
      await act(async () => {
        fetchedTemplate = await result.current.getTemplate('test-template')
      })

      expect(mockService.getTemplate).toHaveBeenCalledWith('test-template', undefined)
      expect(fetchedTemplate).toEqual(template)
    })

    it('should pass version to getTemplate', async () => {
      mockService.getTemplate.mockResolvedValue(null)
      mockService.listTemplates.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.getTemplate('test-template', '2.0.0')
      })

      expect(mockService.getTemplate).toHaveBeenCalledWith('test-template', '2.0.0')
    })
  })

  describe('ensureTemplate()', () => {
    it('should ensure template exists', async () => {
      const template = createMockWorkflowTemplate()
      mockService.ensureTemplate.mockResolvedValue(template)
      mockService.listTemplates.mockResolvedValue([])

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let ensuredTemplate
      await act(async () => {
        ensuredTemplate = await result.current.ensureTemplate('connection-1', 'template-1')
      })

      expect(mockService.ensureTemplate).toHaveBeenCalledWith('connection-1', 'template-1', undefined)
      expect(ensuredTemplate).toEqual(template)
    })
  })

  describe('Error Handling', () => {
    it('should set error state on fetch failure', async () => {
      const error = new Error('Template fetch error')
      mockService.listTemplates.mockRejectedValue(error)

      const { result } = renderHook(() => useWorkflowTemplates(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toEqual(error)
      expect(result.current.templates).toEqual([])
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: usePendingWorkflows
// ═══════════════════════════════════════════════════════════════════════════════

describe('usePendingWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockService.getPendingWorkflows.mockResolvedValue([])
    // Reset mocks
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      writable: true,
    })
  })

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      mockService.getPendingWorkflows.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      const { result } = renderHook(() => usePendingWorkflows(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.pendingWorkflows).toEqual([])
      expect(result.current.count).toBe(0)
    })

    it('should fetch pending workflows on mount', async () => {
      const pending = [mockWorkflowInstances.waitingForInput]
      mockService.getPendingWorkflows.mockResolvedValue(pending)

      const { result } = renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockService.getPendingWorkflows).toHaveBeenCalled()
      expect(result.current.pendingWorkflows).toEqual(pending)
      expect(result.current.count).toBe(1)
    })
  })

  describe('count', () => {
    it('should return correct count of pending workflows', async () => {
      const pending = [
        mockWorkflowInstances.waitingForInput,
        createMockWorkflowInstance({ state: 'waiting_for_input' }),
        createMockWorkflowInstance({ state: 'waiting_for_input' }),
      ]
      mockService.getPendingWorkflows.mockResolvedValue(pending)

      const { result } = renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.count).toBe(3)
    })

    it('should return 0 when no pending workflows', async () => {
      mockService.getPendingWorkflows.mockResolvedValue([])

      const { result } = renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.count).toBe(0)
    })
  })

  describe('refresh()', () => {
    it('should re-fetch pending workflows', async () => {
      mockService.getPendingWorkflows
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockWorkflowInstances.waitingForInput])

      const { result } = renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.count).toBe(0)

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.count).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should set empty array on fetch failure', async () => {
      mockService.getPendingWorkflows.mockRejectedValue(new Error('Fetch error'))

      const { result } = renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pendingWorkflows).toEqual([])
      expect(result.current.count).toBe(0)
    })
  })

  describe('Auto-refresh', () => {
    it('should subscribe to AppState changes', async () => {
      mockService.getPendingWorkflows.mockResolvedValue([])

      renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {})

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should cleanup AppState subscription on unmount', async () => {
      mockService.getPendingWorkflows.mockResolvedValue([])

      const { unmount } = renderHook(() => usePendingWorkflows(), { wrapper })

      await waitFor(() => {})

      unmount()

      expect(mockAppStateSubscription.remove).toHaveBeenCalled()
    })
  })
})
