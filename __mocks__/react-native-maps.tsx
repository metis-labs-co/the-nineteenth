import React from 'react';
import { View } from 'react-native';

const MockMapView: React.FC<any> = ({ children, testID, ...rest }) => (
  <View testID={testID ?? 'mock-mapview'} {...rest}>
    {children}
  </View>
);

export const Marker: React.FC<any> = ({ children, testID, ...rest }) => (
  <View testID={testID ?? 'mock-marker'} {...rest}>
    {children}
  </View>
);

export const Polyline: React.FC<any> = ({ testID, ...rest }) => (
  <View testID={testID ?? 'mock-polyline'} {...rest} />
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
