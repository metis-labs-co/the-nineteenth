import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  TeeMarkerSet,
  buildTeeOptions,
  type TeeOption,
} from '@/components/scorecard/HoleMap';
import type { CustomHoleTee } from '@/types/database/customHoleTees.types';
import type { TeeColorInfo } from '@/utils/teeColors';

const back: TeeOption = {
  key: 'back',
  coordinate: { latitude: 1, longitude: 1 },
  swatch: '#212121',
  label: 'Black tee (back)',
};

const front: TeeOption = {
  key: 'front',
  coordinate: { latitude: 2, longitude: 2 },
  swatch: '#E53935',
  label: 'Red tee (front)',
};

const customTee: TeeOption = {
  key: 'custom-id-1',
  coordinate: { latitude: 3, longitude: 3 },
  swatch: '#FBC02D',
  label: 'Yellow tee — custom',
};

describe('TeeMarkerSet', () => {
  it('renders nothing when no tees', () => {
    const { queryByTestId } = render(
      <TeeMarkerSet tees={[]} selected={null} onSelect={jest.fn()} />
    );
    expect(queryByTestId('tee-marker-back')).toBeNull();
    expect(queryByTestId('tee-marker-front')).toBeNull();
  });

  it('renders one marker per tee', () => {
    const { getByTestId } = render(
      <TeeMarkerSet
        tees={[back, front, customTee]}
        selected="back"
        onSelect={jest.fn()}
      />
    );
    expect(getByTestId('tee-marker-back')).toBeTruthy();
    expect(getByTestId('tee-marker-front')).toBeTruthy();
    expect(getByTestId('tee-marker-custom-id-1')).toBeTruthy();
  });

  it('invokes onSelect with the tee key when its marker is tapped', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TeeMarkerSet
        tees={[back, front]}
        selected="back"
        onSelect={onSelect}
      />
    );
    fireEvent.press(getByTestId('tee-marker-front'));
    expect(onSelect).toHaveBeenCalledWith('front');
  });

  it('invokes onSelect with the custom tee id', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <TeeMarkerSet
        tees={[customTee]}
        selected={null}
        onSelect={onSelect}
      />
    );
    fireEvent.press(getByTestId('tee-marker-custom-id-1'));
    expect(onSelect).toHaveBeenCalledWith('custom-id-1');
  });
});

describe('buildTeeOptions', () => {
  const blackInfo: TeeColorInfo = {
    colorName: 'Black',
    label: 'Black',
    swatch: '#212121',
    teeName: 'Championship',
  };
  const redInfo: TeeColorInfo = {
    colorName: 'Red',
    label: 'Red',
    swatch: '#E53935',
    teeName: 'Forward',
  };
  const emptyInfo: TeeColorInfo = {
    colorName: null,
    label: null,
    swatch: null,
    teeName: null,
  };

  const customRow = (id: string, color: CustomHoleTee['color']): CustomHoleTee => ({
    id,
    course_id: 'c1',
    hole_number: 1,
    user_id: 'u1',
    latitude: 3,
    longitude: 3,
    color,
    created_at: '2026-01-01T00:00:00Z',
  });

  it('omits tees that have no coordinate', () => {
    const out = buildTeeOptions({
      backTeeCoord: null,
      frontTeeCoord: null,
      customTees: [],
      backColor: emptyInfo,
      frontColor: emptyInfo,
    });
    expect(out).toEqual([]);
  });

  it('returns back, front, then customs in order', () => {
    const out = buildTeeOptions({
      backTeeCoord: { latitude: 1, longitude: 1 },
      frontTeeCoord: { latitude: 2, longitude: 2 },
      customTees: [customRow('a', 'red'), customRow('b', 'white')],
      backColor: blackInfo,
      frontColor: redInfo,
    });
    expect(out.map((t) => t.key)).toEqual(['back', 'front', 'a', 'b']);
  });

  it('falls back to neutral grey when course has no resolved swatch', () => {
    const out = buildTeeOptions({
      backTeeCoord: { latitude: 1, longitude: 1 },
      frontTeeCoord: null,
      customTees: [],
      backColor: emptyInfo,
      frontColor: emptyInfo,
    });
    expect(out[0].swatch).toBe('#9E9E9E');
    expect(out[0].label).toBe('Back tee');
  });

  it('uses the resolved colour name in the label when available', () => {
    const out = buildTeeOptions({
      backTeeCoord: { latitude: 1, longitude: 1 },
      frontTeeCoord: null,
      customTees: [],
      backColor: blackInfo,
      frontColor: emptyInfo,
    });
    expect(out[0].label).toBe('Black tee (back)');
  });
});
