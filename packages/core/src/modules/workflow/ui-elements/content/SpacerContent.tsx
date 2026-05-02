import React from 'react'
import { View } from 'react-native'

import { ContentProps, ContentRegistry } from '../ContentRegistry'

const SpacerContent: React.FC<ContentProps> = ({ item }) => {
  return <View style={{ height: item.gap ?? 16 }} />
}

ContentRegistry.register('spacer', SpacerContent)

export default SpacerContent
