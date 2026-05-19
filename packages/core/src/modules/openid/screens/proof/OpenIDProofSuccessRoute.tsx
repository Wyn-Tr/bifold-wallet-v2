import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { CommonActions } from '@react-navigation/native'

import { DeliveryStackParams, Screens, TabStacks } from '../../../../types/navigators'
import { OpenIDProofSuccessScreen } from './OpenIDProofSuccessScreen'

type Props = StackScreenProps<DeliveryStackParams, Screens.OpenIDProofSuccess>

export const OpenIDProofSuccessRoute: React.FC<Props> = ({ navigation, route }) => {
  const { verifierName, verifierDomain, sharedAt } = route.params ?? { verifierName: 'Verifier' }
  return (
    <OpenIDProofSuccessScreen
      verifierName={verifierName}
      verifierDomain={verifierDomain}
      sharedAt={sharedAt}
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

export default OpenIDProofSuccessRoute
