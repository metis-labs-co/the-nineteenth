import React from 'react';
import { Animated, BackHandler, Modal, PanResponder, Text } from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BottomSheet } from './BottomSheet';
import { BottomSheetHeader } from './BottomSheetHeader';

const mockAnimateClose = jest.fn();
jest.mock('./hooks/useBottomSheetAnimation', () => {
  const actual = jest.requireActual('./hooks/useBottomSheetAnimation');
  return {
    useBottomSheetAnimation: (options: Parameters<typeof actual.useBottomSheetAnimation>[0]) => {
      const animation = actual.useBottomSheetAnimation(options);
      mockAnimateClose.mockImplementation(animation.animateClose);
      return { ...animation, animateClose: mockAnimateClose };
    },
  };
});

const event = {} as GestureResponderEvent;
const swipe = { dy: 500, vy: 2, y0: 0 } as PanResponderGestureState;

function setup(overrides: Partial<React.ComponentProps<typeof BottomSheet>> = {}) {
  const onClose = jest.fn();
  const back = jest.spyOn(BackHandler, 'addEventListener');
  const pan = jest.spyOn(PanResponder, 'create');
  const props = { visible: true, onClose, title: 'Test sheet', children: <Text>Content</Text>, ...overrides };
  const view = render(<BottomSheet {...props} />);
  const gesture = pan.mock.calls[0][0];
  const hardwareBack = back.mock.calls[back.mock.calls.length - 1][1];
  return { ...view, props, onClose, gesture, hardwareBack };
}

afterEach(() => jest.restoreAllMocks());

describe('BottomSheet default dismissal characterization', () => {
  it.each(['backdrop', 'close', 'swipe', 'back', 'modal'] as const)(
    'dismisses and animates from %s by default', (route) => {
      const view = setup({ useModal: route === 'modal' });
      act(() => {
        if (route === 'backdrop') fireEvent.press(view.getByLabelText('Close sheet'));
        if (route === 'close') fireEvent.press(view.getByLabelText('Close'));
        if (route === 'swipe') {
          view.gesture.onPanResponderGrant?.(event, swipe);
          view.gesture.onPanResponderRelease?.(event, swipe);
        }
        if (route === 'back') expect(view.hardwareBack()).toBe(true);
        if (route === 'modal') view.UNSAFE_getByType(Modal).props.onRequestClose();
      });
      expect(view.onClose).toHaveBeenCalledTimes(1);
      expect(mockAnimateClose).toHaveBeenCalledTimes(1);
    }
  );

  it('snaps a short drag back without dismissing', () => {
    const spring = jest.spyOn(Animated, 'spring');
    const view = setup();
    spring.mockClear();
    act(() => {
      view.gesture.onPanResponderGrant?.(event, swipe);
      view.gesture.onPanResponderRelease?.(event, { ...swipe, dy: 20, vy: 0 });
    });
    expect(view.onClose).not.toHaveBeenCalled();
    expect(mockAnimateClose).not.toHaveBeenCalled();
    expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  });
});

describe('BottomSheet dismissal lock', () => {
  it('blocks backdrop, back and captured close/gesture callbacks before animation', () => {
    const spring = jest.spyOn(Animated, 'spring');
    const view = setup();
    const capturedClose = view.UNSAFE_getByType(BottomSheetHeader).props.onClose;
    const capturedBack = view.hardwareBack;
    act(() => {
      view.gesture.onPanResponderGrant?.(event, swipe);
      view.gesture.onPanResponderMove?.(event, swipe);
    });
    spring.mockClear();
    view.rerender(<BottomSheet {...view.props} dismissible={false} />);
    expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
    expect(view.queryByLabelText('Close')).toBeNull();
    act(() => {
      fireEvent.press(view.getByLabelText('Close sheet'));
      capturedClose();
      expect(capturedBack()).toBe(true);
      view.gesture.onPanResponderMove?.(event, swipe);
      view.gesture.onPanResponderRelease?.(event, swipe);
    });
    expect(view.onClose).not.toHaveBeenCalled();
    expect(mockAnimateClose).not.toHaveBeenCalled();
  });

  it('consumes modal requests and hardware back while initially locked', () => {
    const view = setup({ useModal: true, dismissible: false });
    act(() => {
      view.UNSAFE_getByType(Modal).props.onRequestClose();
      expect(view.hardwareBack()).toBe(true);
      fireEvent.press(view.getByLabelText('Close sheet'));
    });
    expect(view.onClose).not.toHaveBeenCalled();
    expect(mockAnimateClose).not.toHaveBeenCalled();
  });

  it('uses current enabled state and dismissal callback after unlocking', () => {
    const view = setup({ dismissible: false });
    const latestOnClose = jest.fn();
    view.rerender(<BottomSheet {...view.props} dismissible onClose={latestOnClose} />);
    expect(view.gesture.onMoveShouldSetPanResponder?.(event, swipe)).toBe(true);
    act(() => {
      view.gesture.onPanResponderGrant?.(event, swipe);
      view.gesture.onPanResponderRelease?.(event, swipe);
    });
    expect(latestOnClose).toHaveBeenCalledTimes(1);
    expect(view.onClose).not.toHaveBeenCalled();
    expect(mockAnimateClose).toHaveBeenCalledTimes(1);
  });

  it('does not revive a canceled active gesture when unlocked before release', () => {
    const view = setup();
    act(() => view.gesture.onPanResponderGrant?.(event, swipe));
    view.rerender(<BottomSheet {...view.props} dismissible={false} />);
    view.rerender(<BottomSheet {...view.props} dismissible />);
    act(() => view.gesture.onPanResponderRelease?.(event, swipe));
    expect(view.onClose).not.toHaveBeenCalled();
    expect(mockAnimateClose).not.toHaveBeenCalled();
  });

  it('still closes when the owner sets visible=false while locked', () => {
    const spring = jest.spyOn(Animated, 'spring');
    const view = setup({ dismissible: false });
    spring.mockClear();
    view.rerender(<BottomSheet {...view.props} visible={false} />);
    expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: expect.any(Number) }));
    expect(spring.mock.calls.some(([, config]) => Number(config.toValue) > 0)).toBe(true);
    expect(view.onClose).not.toHaveBeenCalled();
  });
});
