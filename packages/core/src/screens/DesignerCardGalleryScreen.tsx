import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'

import { DesignerCardGallery } from '../modules/openid-card-design/DesignerCardGallery'
import { Screens, SettingStackParams } from '../types/navigators'

type Props = StackScreenProps<SettingStackParams, Screens.DesignerCardGallery>

const DesignerCardGalleryScreen: React.FC<Props> = ({ navigation }) => {
  return <DesignerCardGallery onBack={() => navigation.goBack()} />
}

export default DesignerCardGalleryScreen
