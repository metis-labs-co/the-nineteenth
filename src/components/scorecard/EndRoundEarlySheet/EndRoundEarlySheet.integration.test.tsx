import React from 'react';
import { Animated, BackHandler, Modal, PanResponder } from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BottomSheetHeader } from '@/components/common/BottomSheet/BottomSheetHeader';
import { EndRoundEarlySheet, type EndRoundEarlySheetProps } from './index';

const mockAnimateClose = jest.fn();
jest.mock('@/components/common/BottomSheet/hooks/useBottomSheetAnimation', () => ({
  useBottomSheetAnimation: () => {
    const React = require('react');
    const { Animated } = require('react-native');
    const translateY = React.useRef(new Animated.Value(0)).current;
    const backdropOpacity = React.useRef(new Animated.Value(1)).current;
    return { translateY, backdropOpacity, animateClose: mockAnimateClose, resetAnimation: jest.fn() };
  },
}));

const event = {} as GestureResponderEvent;
const swipe = { dy: 500, vy: 2, y0: 0 } as PanResponderGestureState;
function makeProps(): EndRoundEarlySheetProps {
  return {
    visible: true,
    plan: { holesPlayed: 6, plannedHoles: 18, nineType: 'full', lastHoleNumber: 6, removedScores: [] },
    resultPreview: null,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };
}

afterEach(() => jest.restoreAllMocks());

describe('EndRoundEarlySheet with real BottomSheet', () => {
  it('blocks every inline dismissal route and action when loading starts during a swipe', () => {
    const pan = jest.spyOn(PanResponder, 'create');
    const back = jest.spyOn(BackHandler, 'addEventListener');
    const spring = jest.spyOn(Animated, 'spring');
    const props = makeProps();
    const view = render(<EndRoundEarlySheet {...props} />);
    expect(view.UNSAFE_queryByType(Modal)).toBeNull();
    const close = view.UNSAFE_getByType(BottomSheetHeader).props.onClose;
    const gesture = pan.mock.calls[0][0];
    const hardwareBack = back.mock.calls[back.mock.calls.length - 1][1];
    act(() => {
      gesture.onPanResponderGrant?.(event, swipe);
      gesture.onPanResponderMove?.(event, swipe);
    });
    view.rerender(<EndRoundEarlySheet {...props} loading />);
    expect(view.queryByLabelText('Close')).toBeNull();
    expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
    act(() => {
      fireEvent.press(view.getByLabelText('Close sheet'));
      close();
      expect(hardwareBack()).toBe(true);
      gesture.onPanResponderRelease?.(event, swipe);
      fireEvent.press(view.getByTestId('end-round-early-cancel'));
      fireEvent.press(view.getByTestId('end-round-early-confirm'));
    });
    expect(props.onCancel).not.toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(mockAnimateClose).not.toHaveBeenCalled();
    expect(view.getByText('Ending…')).toBeTruthy();
  });

  it('restores cancellation after loading completes', () => {
    const props = makeProps();
    const view = render(<EndRoundEarlySheet {...props} loading />);
    view.rerender(<EndRoundEarlySheet {...props} loading={false} />);
    fireEvent.press(view.getByLabelText('Close'));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(mockAnimateClose).toHaveBeenCalledTimes(1);
  });
});
