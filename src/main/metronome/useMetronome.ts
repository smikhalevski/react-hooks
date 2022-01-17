import {useContext} from 'react';
import {useSemanticMemo} from '../memo';
import {MetronomeProvider} from './MetronomeProvider';
import {MetronomeProviderContext} from './MetronomeProviderContext';
import {SetTimeout} from '../shared-types';
import {useEffectOnce} from '../effect';

export type MetronomeProtocol = [start: SetTimeout, stop: () => void];

/**
 * The replacement for `setInterval` that is cancelled when component is unmounted. Schedules a function to be
 * repeatedly called with a fixed time delay between each call.
 *
 * All functions that were scheduled with the same delay are invoked synchronously.
 *
 * @see {@link useRerenderMetronome}
 */
export function useMetronome(): Readonly<MetronomeProtocol> {
  const provider = useContext(MetronomeProviderContext);
  const manager = useSemanticMemo(() => createMetronomeManager(provider), [provider]);

  useEffectOnce(manager._effect);

  return manager._protocol;
}

function createMetronomeManager(provider: MetronomeProvider) {

  let cleanup: (() => void) | undefined;

  const start: SetTimeout = (cb, ms = 0, ...args) => {
    stop();

    const metronome = provider.getMetronome(ms);

    const callback = args.length === 0 ? cb : () => {
      cb(...args);
    };
    metronome.add(callback);

    cleanup = () => {
      metronome.remove(callback);
    };
  };

  const stop = () => {
    cleanup?.();
    cleanup = undefined;
  };

  const _effect = () => stop;

  return {
    _effect,
    _protocol: [start, stop] as const,
  };
}
