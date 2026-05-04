import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeTileGrid } from './HomeTileGrid';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: jest.fn() }) };
});

describe('HomeTileGrid', () => {
  it('renders all four tiles', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <HomeTileGrid
          stats={null}
          achievementSummary={null}
          achievementsInProgressCount={0}
          competitions={[]}
          leagues={[]}
          lastRound={null}
        />
      </NavigationContainer>,
    );
    expect(getByTestId('tile-stats')).toBeTruthy();
    expect(getByTestId('tile-achievements')).toBeTruthy();
    expect(getByTestId('tile-competitions')).toBeTruthy();
    expect(getByTestId('tile-last-round')).toBeTruthy();
  });
});
