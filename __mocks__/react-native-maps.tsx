import React from 'react';
import { View } from 'react-native';

// Forwarded ref exposes the imperative camera methods that
// HoleMapScreen calls to position the map after data loads.
const MockMapView = React.forwardRef<unknown, any>(
  ({ children, testID, ...rest }, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      animateCamera: jest.fn(),
      fitToCoordinates: jest.fn(),
    }));
    return (
      <View testID={testID ?? 'mock-mapview'} {...rest}>
        {children}
      </View>
    );
  }
);
MockMapView.displayName = 'MockMapView';

export const Marker: React.FC<any> = ({ children, testID, ...rest }) => (
  <View testID={testID ?? 'mock-marker'} {...rest}>
    {children}
  </View>
);

export const Polyline: React.FC<any> = ({ testID, ...rest }) => (
  <View testID={testID ?? 'mock-polyline'} {...rest} />
);

export const Polygon: React.FC<any> = ({ testID, ...rest }) => (
  <View testID={testID ?? 'mock-polygon'} {...rest} />
);

export const Callout: React.FC<any> = ({ children, ...rest }) => (
  <View {...rest}>{children}</View>
);

export const PROVIDER_DEFAULT = 'default';
export const PROVIDER_GOOGLE = 'google';

export type MapPressEvent = {
  nativeEvent: { coordinate: { latitude: number; longitude: number } };
};

export default MockMapView;
