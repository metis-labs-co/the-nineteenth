import { theNineteenthBrand } from '@/config/brands/theNineteenth.brand';
import { generateDarkColors, generateLightColors } from './colors';

describe('competition redesign neutral palette', () => {
  it('uses the pinned solid light tokens', () => {
    const colors = generateLightColors(theNineteenthBrand, 'solid', 'none');

    expect(colors).toMatchObject({
      background: '#f3f4f6',
      surface: '#ffffff',
      surfaceElevated: '#ffffff',
      surfaceVariant: '#f2f4ef',
      surfaceSelected: '#f7f9f4',
      border: '#e7ebe2',
      borderLight: '#ecefe8',
      textPrimary: '#141b10',
      textSecondary: '#66705c',
      textTertiary: '#8a9382',
      primaryBackground: '#f1f7ed',
    });
  });

  it('uses the pinned solid dark tokens', () => {
    const colors = generateDarkColors(theNineteenthBrand, 'solid', 'none');

    expect(colors).toMatchObject({
      background: '#0e140d',
      surface: '#1c281a',
      surfaceElevated: '#1c281a',
      surfaceVariant: '#232f20',
      surfaceSelected: '#24331b',
      border: '#2d3b27',
      borderLight: '#26331f',
      textPrimary: '#eef3ea',
      textSecondary: '#909e7c',
      textTertiary: '#8b9980',
      primary: '#8bc26e',
      primaryBackground: '#21301a',
    });
  });

  it('preserves translucent tint generation while accepting shared-token spillover', () => {
    const light = generateLightColors(theNineteenthBrand, 'translucent', 'none');
    const dark = generateDarkColors(theNineteenthBrand, 'translucent', 'none');

    expect(light).toMatchObject({
      surface: '#6eac4d0f',
      surfaceVariant: '#6eac4d1f',
      surfaceSelected: '#6eac4d2e',
      border: '#6eac4d24',
      borderLight: '#6eac4d0f',
      textSecondary: '#66705c',
    });
    expect(dark).toMatchObject({
      surface: '#8bc26e14',
      surfaceVariant: '#8bc26e24',
      surfaceSelected: '#8bc26e33',
      border: '#8bc26e2e',
      borderLight: '#8bc26e1a',
      textSecondary: '#909e7c',
    });
  });
});
