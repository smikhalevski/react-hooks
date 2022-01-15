import {useRef} from 'react';
import {useEffectOnce} from '../effect';
import {SetTimeout} from '../shared-types';

export type DebounceProtocol = [debounce: SetTimeout, cancel: () => void];

/**
 * The replacement for `setTimeout` that is cancelled when component is unmounted.
 */
export function useDebounce(): Readonly<DebounceProtocol> {
  const manager = useRef<ReturnType<typeof createDebounceManager>>().current ||= createDebounceManager();

  useEffectOnce(manager._effect);

  return manager._protocol;
}

function createDebounceManager() {

  let timeout: ReturnType<typeof setTimeout>;

  const debounce: SetTimeout = (...args) => {
    cancel();
    timeout = setTimeout(...args);
  };

  const cancel = () => {
    clearTimeout(timeout);
  };

  const _effect = () => cancel;

  return {
    _effect,
    _protocol: [debounce, cancel] as const,
  };
}
