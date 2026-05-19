import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'

import { DeliveryStackParams, Screens } from '../../../../types/navigators'
import { OpenIDProofSendingScreen } from './OpenIDProofSendingScreen'

type Props = StackScreenProps<DeliveryStackParams, Screens.OpenIDProofSending>

export const OpenIDProofSendingRoute: React.FC<Props> = ({ navigation, route }) => {
  const { verifierName } = route.params ?? { verifierName: 'Verifier' }
  return (
    <OpenIDProofSendingScreen
      verifierName={verifierName}
      onCancel={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  )
}

export default OpenIDProofSendingRoute
