// One animation clock for a scene. With Reduce Motion on, scenes hold still.

import { useClock } from '@shopify/react-native-skia'
import { useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated'

export function useSceneClock(): SharedValue<number> {
  const clock = useClock()
  const still = useSharedValue(0)
  return useReducedMotion() ? still : clock
}
