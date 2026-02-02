/**
 * ScaledText Component Tests
 *
 * Tests for the accessible text wrapper component including:
 * - Rendering with different props
 * - Category-based maxFontSizeMultiplier values
 * - Prop forwarding to underlying Paper Text
 * - Default category behavior
 * - Accessibility support
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ScaledText, ScaledTextProps, ScaledTextCategory } from './ScaledText';

// Mock react-native-paper Text to capture maxFontSizeMultiplier
jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    Text: ({
      children,
      style,
      maxFontSizeMultiplier,
      ...props
    }: any) => (
      <Text
        style={style}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        {...props}
      >
        {children}
      </Text>
    ),
  };
});

describe('ScaledText', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ScaledText testID="scaled-text">Test</ScaledText>);
      expect(screen.getByText('Test')).toBeTruthy();
    });

    it('renders children correctly', () => {
      render(<ScaledText>Hello World</ScaledText>);
      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<ScaledText testID="my-text">Content</ScaledText>);
      expect(screen.getByTestId('my-text')).toBeTruthy();
    });

    it('renders empty children', () => {
      render(<ScaledText testID="empty" />);
      expect(screen.getByTestId('empty')).toBeTruthy();
    });

    it('renders numeric children', () => {
      render(<ScaledText>{42}</ScaledText>);
      expect(screen.getByText('42')).toBeTruthy();
    });

    it('renders nested elements', () => {
      render(
        <ScaledText testID="parent">
          Outer <ScaledText testID="nested">Inner</ScaledText>
        </ScaledText>
      );
      expect(screen.getByTestId('parent')).toBeTruthy();
      expect(screen.getByTestId('nested')).toBeTruthy();
    });
  });

  // =========================================================================
  // DEFAULT CATEGORY
  // =========================================================================

  describe('Default Category', () => {
    it('uses body category by default with maxFontSizeMultiplier of 1.5', () => {
      render(<ScaledText testID="default">Default text</ScaledText>);
      const text = screen.getByTestId('default');
      expect(text.props.maxFontSizeMultiplier).toBe(1.5);
    });

    it('explicitly setting body category has same multiplier', () => {
      render(
        <ScaledText testID="explicit-body" category="body">
          Body text
        </ScaledText>
      );
      const text = screen.getByTestId('explicit-body');
      expect(text.props.maxFontSizeMultiplier).toBe(1.5);
    });
  });

  // =========================================================================
  // CATEGORY MULTIPLIERS
  // =========================================================================

  describe('Category Multipliers', () => {
    it('critical category has maxFontSizeMultiplier of 1.2', () => {
      render(
        <ScaledText testID="critical" category="critical">
          Score
        </ScaledText>
      );
      const text = screen.getByTestId('critical');
      expect(text.props.maxFontSizeMultiplier).toBe(1.2);
    });

    it('title category has maxFontSizeMultiplier of 1.35', () => {
      render(
        <ScaledText testID="title" category="title">
          Page Title
        </ScaledText>
      );
      const text = screen.getByTestId('title');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
    });

    it('body category has maxFontSizeMultiplier of 1.5', () => {
      render(
        <ScaledText testID="body" category="body">
          Description
        </ScaledText>
      );
      const text = screen.getByTestId('body');
      expect(text.props.maxFontSizeMultiplier).toBe(1.5);
    });

    it('caption category has maxFontSizeMultiplier of 1.35', () => {
      render(
        <ScaledText testID="caption" category="caption">
          Small label
        </ScaledText>
      );
      const text = screen.getByTestId('caption');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
    });

    it('display category has maxFontSizeMultiplier of 1.35', () => {
      render(
        <ScaledText testID="display" category="display">
          +12
        </ScaledText>
      );
      const text = screen.getByTestId('display');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
    });

    it('all categories render correctly', () => {
      const categories: ScaledTextCategory[] = [
        'critical',
        'title',
        'body',
        'caption',
        'display',
      ];
      const expectedMultipliers: Record<ScaledTextCategory, number> = {
        critical: 1.2,
        title: 1.35,
        body: 1.5,
        caption: 1.35,
        display: 1.35,
      };

      categories.forEach((category) => {
        render(
          <ScaledText testID={`cat-${category}`} category={category}>
            {category}
          </ScaledText>
        );
        const text = screen.getByTestId(`cat-${category}`);
        expect(text.props.maxFontSizeMultiplier).toBe(
          expectedMultipliers[category]
        );
      });
    });
  });

  // =========================================================================
  // PROP FORWARDING
  // =========================================================================

  describe('Prop Forwarding', () => {
    it('forwards style prop', () => {
      const customStyle = { color: 'red', fontSize: 16 };
      render(
        <ScaledText testID="styled" style={customStyle}>
          Styled
        </ScaledText>
      );
      const text = screen.getByTestId('styled');
      expect(text.props.style).toEqual(customStyle);
    });

    it('forwards accessibilityLabel', () => {
      render(
        <ScaledText testID="a11y" accessibilityLabel="Custom label">
          Text
        </ScaledText>
      );
      const text = screen.getByTestId('a11y');
      expect(text.props.accessibilityLabel).toBe('Custom label');
    });

    it('forwards accessibilityRole', () => {
      render(
        <ScaledText testID="role" accessibilityRole="header">
          Header
        </ScaledText>
      );
      const text = screen.getByTestId('role');
      expect(text.props.accessibilityRole).toBe('header');
    });

    it('forwards numberOfLines', () => {
      render(
        <ScaledText testID="lines" numberOfLines={2}>
          Truncated text
        </ScaledText>
      );
      const text = screen.getByTestId('lines');
      expect(text.props.numberOfLines).toBe(2);
    });

    it('forwards ellipsizeMode', () => {
      render(
        <ScaledText testID="ellipsize" ellipsizeMode="tail">
          Long text
        </ScaledText>
      );
      const text = screen.getByTestId('ellipsize');
      expect(text.props.ellipsizeMode).toBe('tail');
    });

    it('forwards onPress handler', () => {
      const onPress = jest.fn();
      render(
        <ScaledText testID="pressable" onPress={onPress}>
          Pressable
        </ScaledText>
      );
      const text = screen.getByTestId('pressable');
      expect(text.props.onPress).toBe(onPress);
    });

    it('forwards multiple props simultaneously', () => {
      const customStyle = { fontWeight: 'bold' as const };
      const onPress = jest.fn();
      render(
        <ScaledText
          testID="multi"
          category="title"
          style={customStyle}
          numberOfLines={1}
          accessibilityLabel="Multi prop text"
          onPress={onPress}
        >
          Multiple props
        </ScaledText>
      );
      const text = screen.getByTestId('multi');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
      expect(text.props.style).toEqual(customStyle);
      expect(text.props.numberOfLines).toBe(1);
      expect(text.props.accessibilityLabel).toBe('Multi prop text');
      expect(text.props.onPress).toBe(onPress);
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders page header title', () => {
      render(
        <ScaledText testID="header" category="title">
          Leaderboard
        </ScaledText>
      );
      const text = screen.getByTestId('header');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
      expect(screen.getByText('Leaderboard')).toBeTruthy();
    });

    it('renders score button text', () => {
      render(
        <ScaledText testID="score" category="critical">
          7
        </ScaledText>
      );
      const text = screen.getByTestId('score');
      expect(text.props.maxFontSizeMultiplier).toBe(1.2);
    });

    it('renders leaderboard caption', () => {
      render(
        <ScaledText testID="caption" category="caption">
          Par 4 | 385m
        </ScaledText>
      );
      const text = screen.getByTestId('caption');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
    });

    it('renders handicap display number', () => {
      render(
        <ScaledText testID="handicap" category="display">
          +12.4
        </ScaledText>
      );
      const text = screen.getByTestId('handicap');
      expect(text.props.maxFontSizeMultiplier).toBe(1.35);
    });

    it('renders description text', () => {
      render(
        <ScaledText testID="description">
          Enter scores for your group below
        </ScaledText>
      );
      const text = screen.getByTestId('description');
      expect(text.props.maxFontSizeMultiplier).toBe(1.5);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles empty string children', () => {
      render(<ScaledText testID="empty-string">{''}</ScaledText>);
      expect(screen.getByTestId('empty-string')).toBeTruthy();
    });

    it('handles whitespace-only children', () => {
      render(<ScaledText testID="whitespace">   </ScaledText>);
      expect(screen.getByTestId('whitespace')).toBeTruthy();
    });

    it('handles special characters', () => {
      render(<ScaledText>+5 @ Hole #9</ScaledText>);
      expect(screen.getByText('+5 @ Hole #9')).toBeTruthy();
    });

    it('handles negative numbers', () => {
      render(<ScaledText category="critical">-3</ScaledText>);
      expect(screen.getByText('-3')).toBeTruthy();
    });

    it('handles long text', () => {
      const longText = 'This is a very long text that might need truncation';
      render(<ScaledText numberOfLines={1}>{longText}</ScaledText>);
      expect(screen.getByText(longText)).toBeTruthy();
    });
  });

  // =========================================================================
  // TYPE SAFETY
  // =========================================================================

  describe('Type Safety', () => {
    it('ScaledTextProps interface allows all Paper Text props', () => {
      // This test ensures the type definitions are correct
      const props: ScaledTextProps = {
        category: 'title',
        children: 'Test',
        style: { color: 'blue' },
        testID: 'test',
        numberOfLines: 1,
        ellipsizeMode: 'tail',
        accessibilityLabel: 'Test text',
      };

      render(<ScaledText {...props} />);
      expect(screen.getByTestId('test')).toBeTruthy();
    });

    it('category prop only accepts valid categories', () => {
      // TypeScript would catch invalid categories at compile time
      // This test verifies runtime behavior with valid categories
      const validCategories: ScaledTextCategory[] = [
        'display',
        'title',
        'body',
        'caption',
        'critical',
      ];

      validCategories.forEach((category) => {
        const { unmount } = render(
          <ScaledText testID="type-test" category={category}>
            Test
          </ScaledText>
        );
        expect(screen.getByTestId('type-test')).toBeTruthy();
        unmount();
      });
    });
  });
});
