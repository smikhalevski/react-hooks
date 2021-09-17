import {DependencyList, useRef} from 'react';
import {createSemanticMemoHook} from './createSemanticMemoHook';

/**
 * A semantic guarantee drop-in replacement for `React.useMemo`. It guarantees that the value produced by `factory`
 * won't be "forgotten" until the hook is unmounted.
 */
export function useSemanticMemo<T>(factory: () => T, deps?: DependencyList): T {
  const hook = useRef<ReturnType<typeof createSemanticMemoHook>>().current ||= createSemanticMemoHook(false);
  return hook(factory, deps);
}