import React from 'react'
import { View } from 'react-native'

import { ContentProps, ContentRegistry } from '../ContentRegistry'

const DividerContent: React.FC<ContentProps> = ({ colors }) => {
  return (
    <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.3, marginVertical: 4 }} />
  )
}

ContentRegistry.register('divider', DividerContent)

export default DividerContent
