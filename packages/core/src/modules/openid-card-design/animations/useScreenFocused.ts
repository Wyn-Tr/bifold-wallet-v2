// Safe focus probe — returns false when the host screen is not the active
// route, true otherwise (including when the consumer is rendered outside any
// navigator, e.g. tests or the dev gallery).
//
// `useIsFocused` from React Navigation throws when called outside a
// navigation context. We read the underlying `NavigationContext` directly
// and only consult it when present so non-screen usages (tests, the dev
// gallery) don't crash.

import { useContext, useEffect, useState } from 'react'
import { NavigationContext } from '@react-navigation/native'

export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext)
  const [focused, setFocused] = useState(() => (navigation ? navigation.isFocused() : true))

  useEffect(() => {
    if (!navigation) return
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    const unsubFocus = navigation.addListener('focus', onFocus)
    const unsubBlur = navigation.addListener('blur', onBlur)
    setFocused(navigation.isFocused())
    return () => {
      unsubFocus()
      unsubBlur()
    }
  }, [navigation])

  return focused
}
