import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { CommonActions } from '@react-navigation/native'

import { DeliveryStackParams, Screens, TabStacks } from '../../../../types/navigators'
import { OpenIDCredentialAcceptedScreen } from './OpenIDCredentialAcceptedScreen'

type Props = StackScreenProps<DeliveryStackParams, Screens.OpenIDCredentialAccepted>

export const OpenIDCredentialAcceptedRoute: React.FC<Props> = ({ navigation, route }) => {
  const { credentialName, issuerName } = route.params ?? { credentialName: 'Credential' }
  return (
    <OpenIDCredentialAcceptedScreen
      credentialName={credentialName}
      issuerName={issuerName}
      onDone={() =>
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: TabStacks.HomeStack }],
          })
        )
      }
    />
  )
}

export default OpenIDCredentialAcceptedRoute
