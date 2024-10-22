import { PubSub } from 'parallel-universe';
import { DOMAttributes, EffectCallback, PointerEventHandler, useLayoutEffect, useState } from 'react';
import { useFunction } from '../useFunction';
import { isPortalEvent } from '../utils/dom';
import { emptyArray, emptyObject } from '../utils/lang';

const cancelHoverPubSub = new PubSub();

/**
 * Cancels hover of all currently hovered elements.
 *
 * @see {@link useHover}
 * @group Behaviors
 */
export function cancelHover(): void {
  cancelHoverPubSub.publish();
}

/**
 * A value returned from the {@link useHover} hook.
 *
 * @group Behaviors
 */
export interface HoverValue {
  /**
   * Props of an element for which hover interactions are tracked.
   *
   * An object which identity never changes between renders.
   */
  hoverProps: DOMAttributes<Element>;

  /**
   * `true` if an element is currently hovered.
   */
  isHovered: boolean;
}

/**
 * Props of the {@link useHover} hook.
 *
 * @group Behaviors
 */
export interface HoverProps {
  /**
   * If `true` then hover events are disabled.
   *
   * @default false
   */
  isDisabled?: boolean;

  /**
   * A handler that is called when a hover interaction starts.
   */
  onHoverStart?: () => void;

  /**
   * A handler that is called when a hover interaction ends.
   */
  onHoverEnd?: () => void;

  /**
   * A handler that is called when the hover state changes.
   *
   * @param isHovered `true` if an element is hovered.
   */
  onHoverChange?: (isHovered: boolean) => void;
}

/**
 * Handles hover events and normalizes them across platforms.
 *
 * @param props Hover props.
 * @returns An object which identity never changes between renders.
 * @group Behaviors
 */
export function useHover(props: HoverProps = emptyObject): HoverValue {
  const [isHovered, setHovered] = useState(false);

  const manager = useFunction(createHoverManager, setHovered);

  manager.props = props;
  manager.value.isHovered = isHovered;

  useLayoutEffect(manager.onMount, emptyArray);
  useLayoutEffect(manager.onUpdate);

  return manager.value;
}

const STATUS_NOT_HOVERED = 0;
const STATUS_HOVERED = 1;
const STATUS_HOVER_DISCARDED = 2;

let hoverManagerCount = 0;

interface HoverManager {
  props: HoverProps;
  value: HoverValue;
  onMount: EffectCallback;
  onUpdate: EffectCallback;
}

function createHoverManager(setHovered: (isHovered: boolean) => void): HoverManager {
  let status = STATUS_NOT_HOVERED;

  const cancel = (): void => {
    const { onHoverChange, onHoverEnd } = manager.props;

    if (status !== STATUS_HOVERED) {
      status = STATUS_NOT_HOVERED;
      return;
    }

    status = STATUS_NOT_HOVERED;
    setHovered(false);

    onHoverChange?.(false);
    onHoverEnd?.();
  };

  const handleMount: EffectCallback = () => {
    const unsubscribeCancelHover = cancelHoverPubSub.subscribe(cancel);

    if (++hoverManagerCount === 1) {
      window.addEventListener('blur', cancelHover);
    }

    return () => {
      unsubscribeCancelHover();

      if (hoverManagerCount-- === 1) {
        window.removeEventListener('blur', cancelHover);
      }
    };
  };

  const handleUpdate: EffectCallback = () => {
    if (manager.props.isDisabled) {
      cancel();
    }
  };

  const handlePointerHover: PointerEventHandler = event => {
    const { isDisabled, onHoverChange, onHoverStart } = manager.props;

    if (event.pointerType !== 'mouse' && status === STATUS_NOT_HOVERED) {
      // Disable hover on touchscreens
      // Also fixes iOS Safari https://bugs.webkit.org/show_bug.cgi?id=214609
      status = STATUS_HOVER_DISCARDED;
      return;
    }

    if (event.pointerType === 'mouse' && status === STATUS_HOVER_DISCARDED) {
      status = STATUS_NOT_HOVERED;
      return;
    }

    if (
      isDisabled ||
      status !== STATUS_NOT_HOVERED ||
      event.pointerType !== 'mouse' ||
      event.buttons !== 0 ||
      isPortalEvent(event)
    ) {
      return;
    }

    status = STATUS_HOVERED;
    setHovered(true);

    onHoverChange?.(true);
    onHoverStart?.();
  };

  const handlePointerLeave: PointerEventHandler = event => {
    if (status !== STATUS_HOVERED || event.pointerType !== 'mouse' || isPortalEvent(event)) {
      return;
    }
    cancel();
  };

  const manager: HoverManager = {
    props: undefined!,
    value: {
      isHovered: false,
      hoverProps: {
        onPointerEnter: handlePointerHover,
        onPointerMove: handlePointerHover,
        onPointerLeave: handlePointerLeave,
      },
    },
    onMount: handleMount,
    onUpdate: handleUpdate,
  };

  return manager;
}