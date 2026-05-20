// Safe focus probe — returns false when the host screen is not the active
// route, true otherwise (including when the consumer is rendered outside any
// navigator, e.g. tests or the dev gallery).
//
// `useIsFocused` from React Navigation throws when called outside a
// navigation context. We read the underlying `NavigationContext` directly
// and only consult it when present so non-screen usages (tests, the dev
// gallery) don't crash.

import { createContext, useContext, useEffect, useState } from 'react'
import * as ReactNavigation from '@react-navigation/native'

// In the jest mock of @react-navigation/native, NavigationContext is not
// exported. Calling useContext(undefined) crashes with "Cannot read
// properties of undefined (reading '_context')". Fall back to an empty
// local context so components that consult this hook still render (with
// `focused = true`) in tests and the dev gallery.
const FallbackNavigationContext = createContext<unknown>(undefined)
const NavCtx =
  (ReactNavigation as { NavigationContext?: typeof FallbackNavigationContext }).NavigationContext ??
  FallbackNavigationContext

type NavigationLike = {
  isFocused: () => boolean
  addListener: (event: 'focus' | 'blur', cb: () => void) => () => void
}

export function useScreenFocused(): boolean {
  const navigation = useContext(NavCtx) as NavigationLike | undefined
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
