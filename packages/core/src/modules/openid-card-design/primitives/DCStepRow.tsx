// Step indicator + label + hint + time stamp. Ports `StepRow` from screens.jsx.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { DC_PALETTE } from '../tokens'
import { DCStepIcon, DCStepState } from './DCStepIcon'

export interface DCStepRowProps {
  state: DCStepState
  label: string
  hint?: string
  time?: string
}

export const DCStepRow: React.FC<DCStepRowProps> = ({ state, label, hint, time }) => (
  <View style={styles.container}>
    <DCStepIcon state={state} />
    <View style={styles.body}>
      <Text style={[styles.label, state === 'pending' ? styles.labelMuted : null]}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
    {time ? <Text style={styles.time}>{time}</Text> : null}
  </View>
)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  body: { flex: 1, marginLeft: 12 },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  labelMuted: { color: DC_PALETTE.muted, fontWeight: '500' },
  hint: { color: DC_PALETTE.subMuted, fontSize: 12, marginTop: 2 },
  time: { color: DC_PALETTE.subMuted, fontSize: 11, marginLeft: 8 },
})

export default DCStepRow
