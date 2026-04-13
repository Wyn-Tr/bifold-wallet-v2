import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import HeaderRightHome from '../components/buttons/HeaderHome'
import { useTheme } from '../contexts/theme'
import { ContactStackParams, Screens } from '../types/navigators'

import { useDefaultStackOptions } from './defaultStackOptions'
import { TOKENS, useServices } from '../container-api'
import { View } from 'react-native'

const ContactStack: React.FC = () => {
  const Stack = createStackNavigator<ContactStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [
    ScreenOptionsDictionary,
    // Injectable screens
    ListContacts,
    ContactDetails,
    RenameContact,
    JSONDetails,
    Chat,
    WhatAreContacts,
    CredentialDetails,
    ProofDetails,
    WorkflowDetails,
    WorkflowTemplatePicker,
  ] = useServices([
    TOKENS.OBJECT_SCREEN_CONFIG,
    // Injectable screens
    TOKENS.SCREEN_LIST_CONTACTS,
    TOKENS.SCREEN_CONTACT_DETAILS,
    TOKENS.SCREEN_RENAME_CONTACT,
    TOKENS.SCREEN_JSON_DETAILS,
    TOKENS.SCREEN_CHAT,
    TOKENS.SCREEN_WHAT_ARE_CONTACTS,
    TOKENS.SCREEN_CREDENTIAL_DETAILS,
    TOKENS.SCREEN_PROOF_DETAILS,
    TOKENS.SCREEN_WORKFLOW_DETAILS,
    TOKENS.SCREEN_WORKFLOW_TEMPLATE_PICKER,
  ])

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen
        name={Screens.Contacts}
        component={ListContacts}
        options={{ title: t('Screens.Contacts'), ...ScreenOptionsDictionary[Screens.Contacts] }}
      />
      <Stack.Screen
        name={Screens.ContactDetails}
        component={ContactDetails}
        options={{
          ...ScreenOptionsDictionary[Screens.ContactDetails],

          title: t('Screens.ContactDetails'),

          headerTransparent: true,

          headerStyle: {
            backgroundColor: 'transparent',
          },

          headerTitleAlign: 'left',
          headerTintColor: theme.ColorPalette.brand.headerText,
          headerTitleStyle: theme.TextTheme.headerTitle,

          cardStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />

      <Stack.Screen
        name={Screens.RenameContact}
        component={RenameContact}
        options={{
          ...ScreenOptionsDictionary[Screens.RenameContact],
        }}
      />
      <Stack.Screen
        name={Screens.JSONDetails}
        component={JSONDetails}
        options={{
          title: t('Screens.JSONDetails'),
          ...ScreenOptionsDictionary[Screens.JSONDetails],
        }}
      />
      <Stack.Screen
        name={Screens.Chat}
        component={Chat}
        options={{
          ...ScreenOptionsDictionary[Screens.Chat],
          headerShown: true,
          headerBackground: () => <View style={{ flex: 1, backgroundColor: '#005F5F' }} />,
        }}
      />
      <Stack.Screen
        name={Screens.WhatAreContacts}
        component={WhatAreContacts}
        options={{
          title: '',
          ...ScreenOptionsDictionary[Screens.WhatAreContacts],
        }}
      />
      <Stack.Screen
        name={Screens.CredentialDetails}
        component={CredentialDetails}
        options={{
          ...ScreenOptionsDictionary[Screens.CredentialDetails],
          title: t('Screens.CredentialDetails'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.ProofDetails}
        component={ProofDetails}
        options={() => ({
          title: '',
          headerRight: () => <HeaderRightHome />,
          ...ScreenOptionsDictionary[Screens.ProofDetails],
        })}
      />
      <Stack.Screen
        name={Screens.WorkflowDetails}
        component={WorkflowDetails}
        options={{
          title: t('Screens.WorkflowDetails') || 'Workflow Details',
          ...ScreenOptionsDictionary[Screens.WorkflowDetails],
        }}
      />
      <Stack.Screen
        name={Screens.WorkflowTemplatePicker}
        component={WorkflowTemplatePicker}
        options={{
          title: t('Screens.WorkflowTemplatePicker') || 'Start Workflow',
          ...ScreenOptionsDictionary[Screens.WorkflowTemplatePicker],
        }}
      />
    </Stack.Navigator>
  )
}

export default ContactStack
