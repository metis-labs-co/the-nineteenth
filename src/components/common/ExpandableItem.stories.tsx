/**
 * ExpandableItem Storybook Stories
 *
 * Stories demonstrating the various configurations of the ExpandableItem component.
 * Shows expanded/collapsed states, custom icons, animation options, and use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ExpandableItem,
  ExpandableList,
} from './ExpandableItem';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ExpandableItem> = {
  title: 'Common/ExpandableItem',
  component: ExpandableItem,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    isExpanded: { control: 'boolean' },
    showBorder: { control: 'boolean' },
    isLast: { control: 'boolean' },
    animated: { control: 'boolean' },
    collapsedIcon: { control: 'text' },
    expandedIcon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof ExpandableItem>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.md,
  },
  answerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    title: 'Click to expand',
    isExpanded: false,
    showBorder: true,
    isLast: false,
    animated: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        This is the expandable content that appears when the item is expanded.
      </Text>
    ),
  },
};

export const Expanded: Story = {
  args: {
    title: 'This item is expanded',
    isExpanded: true,
    showBorder: true,
    isLast: false,
    animated: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        You can see this content because the item is expanded. Click the header
        to collapse it.
      </Text>
    ),
  },
};

export const Collapsed: Story = {
  args: {
    title: 'This item is collapsed',
    isExpanded: false,
    showBorder: true,
    isLast: false,
    animated: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        This content is hidden until you expand the item.
      </Text>
    ),
  },
};

// ===========================================================================
// INTERACTIVE DEMO
// ===========================================================================

function InteractiveExpandableItem() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StoryWrapper>
      <Section title="Interactive Demo">
        <ExpandableList expandedId={isExpanded ? '1' : null} onToggle={() => {}}>
          <ExpandableItem
            title="Click to toggle"
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          >
            <Text style={wrapperStyles.answerText}>
              This content can be toggled by clicking the header. Try it out!
            </Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveExpandableItem />,
};

// ===========================================================================
// CUSTOM ICONS
// ===========================================================================

export const WithPlusMinusIcons: Story = {
  args: {
    title: 'Custom plus/minus icons',
    isExpanded: false,
    collapsedIcon: 'plus',
    expandedIcon: 'minus',
    children: (
      <Text style={wrapperStyles.answerText}>
        This item uses plus/minus icons instead of chevrons.
      </Text>
    ),
  },
};

export const WithArrowIcons: Story = {
  args: {
    title: 'Arrow icons',
    isExpanded: false,
    collapsedIcon: 'arrow-down',
    expandedIcon: 'arrow-up',
    children: (
      <Text style={wrapperStyles.answerText}>
        This item uses arrow icons for expand/collapse.
      </Text>
    ),
  },
};

export const ExpandedWithCustomIcon: Story = {
  args: {
    title: 'Expanded with minus icon',
    isExpanded: true,
    collapsedIcon: 'plus',
    expandedIcon: 'minus',
    children: (
      <Text style={wrapperStyles.answerText}>
        The minus icon indicates this can be collapsed.
      </Text>
    ),
  },
};

// ===========================================================================
// BORDER OPTIONS
// ===========================================================================

export const WithBorder: Story = {
  args: {
    title: 'Item with border',
    isExpanded: false,
    showBorder: true,
    isLast: false,
    children: (
      <Text style={wrapperStyles.answerText}>
        This item has a bottom border.
      </Text>
    ),
  },
};

export const WithoutBorder: Story = {
  args: {
    title: 'Item without border',
    isExpanded: false,
    showBorder: false,
    children: (
      <Text style={wrapperStyles.answerText}>
        This item has no bottom border.
      </Text>
    ),
  },
};

export const LastItem: Story = {
  args: {
    title: 'Last item (no border)',
    isExpanded: false,
    showBorder: true,
    isLast: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        Last items in a list typically have no bottom border.
      </Text>
    ),
  },
};

// ===========================================================================
// ANIMATION OPTIONS
// ===========================================================================

export const WithAnimation: Story = {
  args: {
    title: 'Animated expand/collapse',
    isExpanded: false,
    animated: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        This item has smooth animation when expanding and collapsing.
      </Text>
    ),
  },
};

export const WithoutAnimation: Story = {
  args: {
    title: 'No animation',
    isExpanded: false,
    animated: false,
    children: (
      <Text style={wrapperStyles.answerText}>
        This item expands and collapses instantly without animation.
      </Text>
    ),
  },
};

// ===========================================================================
// FAQ USE CASE
// ===========================================================================

function FAQDemo() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs = [
    {
      id: '1',
      question: 'How do I create a competition?',
      answer:
        'Go to the Competitions tab and tap the "+" button in the top right corner. Follow the wizard to set up your competition name, dates, scoring format, and invite players.',
    },
    {
      id: '2',
      question: 'How are handicaps calculated?',
      answer:
        'We use the World Handicap System (WHS) to calculate handicaps. Your playing handicap is determined by your handicap index, the course rating, and slope rating of the course you\'re playing.',
    },
    {
      id: '3',
      question: 'Can I edit scores after submission?',
      answer:
        'Yes, competition organizers can edit scores after they\'ve been submitted. Go to the round details page and tap on the scorecard to make changes.',
    },
    {
      id: '4',
      question: 'How do I invite players to my competition?',
      answer:
        'You can invite players by sharing the competition invite code, sending email invitations, or searching for friends already on the platform.',
    },
  ];

  return (
    <StoryWrapper>
      <Section title="FAQ Example">
        <ExpandableList
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        >
          {faqs.map((faq, index) => (
            <ExpandableItem
              key={faq.id}
              title={faq.question}
              isExpanded={expandedId === faq.id}
              onToggle={() =>
                setExpandedId(expandedId === faq.id ? null : faq.id)
              }
              isLast={index === faqs.length - 1}
            >
              <Text style={wrapperStyles.answerText}>{faq.answer}</Text>
            </ExpandableItem>
          ))}
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const FAQExample: Story = {
  render: () => <FAQDemo />,
};

// ===========================================================================
// SETTINGS USE CASE
// ===========================================================================

function SettingsDemo() {
  const [expandedId, setExpandedId] = useState<string | null>('notifications');

  return (
    <StoryWrapper>
      <Section title="Settings Sections">
        <ExpandableList
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        >
          <ExpandableItem
            title="Notification Preferences"
            isExpanded={expandedId === 'notifications'}
            onToggle={() =>
              setExpandedId(
                expandedId === 'notifications' ? null : 'notifications'
              )
            }
            collapsedIcon="bell-outline"
            expandedIcon="bell"
          >
            <View style={{ gap: 8 }}>
              <Text style={wrapperStyles.answerText}>
                Push notifications: Enabled
              </Text>
              <Text style={wrapperStyles.answerText}>
                Email notifications: Daily digest
              </Text>
              <Text style={wrapperStyles.answerText}>
                Round reminders: 1 hour before
              </Text>
            </View>
          </ExpandableItem>
          <ExpandableItem
            title="Privacy Settings"
            isExpanded={expandedId === 'privacy'}
            onToggle={() =>
              setExpandedId(expandedId === 'privacy' ? null : 'privacy')
            }
            collapsedIcon="lock-outline"
            expandedIcon="lock"
          >
            <View style={{ gap: 8 }}>
              <Text style={wrapperStyles.answerText}>
                Profile visibility: Friends only
              </Text>
              <Text style={wrapperStyles.answerText}>
                Score sharing: Competition members
              </Text>
            </View>
          </ExpandableItem>
          <ExpandableItem
            title="Account Settings"
            isExpanded={expandedId === 'account'}
            onToggle={() =>
              setExpandedId(expandedId === 'account' ? null : 'account')
            }
            collapsedIcon="account-outline"
            expandedIcon="account"
            isLast
          >
            <View style={{ gap: 8 }}>
              <Text style={wrapperStyles.answerText}>Email: john@example.com</Text>
              <Text style={wrapperStyles.answerText}>Handicap: 12.4</Text>
              <Text style={wrapperStyles.answerText}>Home Club: Royal Melbourne</Text>
            </View>
          </ExpandableItem>
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const SettingsExample: Story = {
  render: () => <SettingsDemo />,
};

// ===========================================================================
// HELP TOPICS USE CASE
// ===========================================================================

function HelpTopicsDemo() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topics = [
    {
      id: 'scoring',
      title: 'Scoring Rules',
      content:
        'Stableford scoring awards points based on your score relative to par on each hole. You receive 2 points for par, 3 for birdie, 4 for eagle, 1 for bogey, and 0 for double bogey or worse.',
    },
    {
      id: 'matchplay',
      title: 'Match Play Format',
      content:
        'In match play, you compete hole-by-hole against your opponent. Win a hole by scoring lower, and the match is determined by how many holes you\'re ahead with holes remaining.',
    },
    {
      id: 'scramble',
      title: 'Scramble Team Format',
      content:
        'In Scramble, all team members hit their tee shots. The best shot is selected, and all players hit from that spot. This continues until the ball is holed.',
    },
  ];

  return (
    <StoryWrapper>
      <Section title="Help Topics">
        <ExpandableList
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        >
          {topics.map((topic, index) => (
            <ExpandableItem
              key={topic.id}
              title={topic.title}
              isExpanded={expandedId === topic.id}
              onToggle={() =>
                setExpandedId(expandedId === topic.id ? null : topic.id)
              }
              isLast={index === topics.length - 1}
              collapsedIcon="help-circle-outline"
              expandedIcon="help-circle"
            >
              <Text style={wrapperStyles.answerText}>{topic.content}</Text>
            </ExpandableItem>
          ))}
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const HelpTopics: Story = {
  render: () => <HelpTopicsDemo />,
};

// ===========================================================================
// MULTIPLE EXPANDED (allowMultiple)
// ===========================================================================

function MultipleExpandedDemo() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1']));

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <StoryWrapper>
      <Section title="Multiple Items Expanded">
        <ExpandableList expandedId={null} onToggle={() => {}}>
          <ExpandableItem
            title="First Section"
            isExpanded={expandedIds.has('1')}
            onToggle={() => toggleItem('1')}
          >
            <Text style={wrapperStyles.answerText}>
              Content for the first section. Multiple sections can be open at
              once.
            </Text>
          </ExpandableItem>
          <ExpandableItem
            title="Second Section"
            isExpanded={expandedIds.has('2')}
            onToggle={() => toggleItem('2')}
          >
            <Text style={wrapperStyles.answerText}>
              Content for the second section. This can be expanded independently.
            </Text>
          </ExpandableItem>
          <ExpandableItem
            title="Third Section"
            isExpanded={expandedIds.has('3')}
            onToggle={() => toggleItem('3')}
            isLast
          >
            <Text style={wrapperStyles.answerText}>
              Content for the third section. All three can be open at once!
            </Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const MultipleExpanded: Story = {
  render: () => <MultipleExpandedDemo />,
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongTitle: Story = {
  args: {
    title:
      'This is a very long title that might need to wrap to multiple lines in the user interface',
    isExpanded: false,
    children: (
      <Text style={wrapperStyles.answerText}>Content for long title item.</Text>
    ),
  },
};

export const ShortTitle: Story = {
  args: {
    title: 'FAQ',
    isExpanded: false,
    children: <Text style={wrapperStyles.answerText}>Short title content.</Text>,
  },
};

export const LongContent: Story = {
  args: {
    title: 'Item with long content',
    isExpanded: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        This is a very long piece of content that demonstrates how the
        expandable item handles lengthy text. Lorem ipsum dolor sit amet,
        consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
        et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
        exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
        dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
        proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      </Text>
    ),
  },
};

export const WithEmoji: Story = {
  args: {
    title: 'How to improve your game?',
    isExpanded: true,
    children: (
      <Text style={wrapperStyles.answerText}>
        Practice regularly and enjoy the process!
      </Text>
    ),
  },
};

// ===========================================================================
// COMPLEX CONTENT
// ===========================================================================

function ComplexContentDemo() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <StoryWrapper>
      <Section title="Complex Content">
        <ExpandableList expandedId={isExpanded ? '1' : null} onToggle={() => {}}>
          <ExpandableItem
            title="Competition Details"
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          >
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>Format</Text>
                <Text style={wrapperStyles.answerText}>Stableford - Individual</Text>
              </View>
              <View>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>Rounds</Text>
                <Text style={wrapperStyles.answerText}>4 rounds over 4 weeks</Text>
              </View>
              <View>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>Players</Text>
                <Text style={wrapperStyles.answerText}>12 players registered</Text>
              </View>
              <View>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>Next Round</Text>
                <Text style={wrapperStyles.answerText}>
                  Saturday 15th January - Royal Melbourne
                </Text>
              </View>
            </View>
          </ExpandableItem>
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const ComplexContent: Story = {
  render: () => <ComplexContentDemo />,
};

// ===========================================================================
// ALL STATES SHOWCASE
// ===========================================================================

function AllStatesShowcase() {
  const [expandedId, setExpandedId] = useState<string | null>('expanded');

  return (
    <StoryWrapper>
      <Section title="Collapsed State">
        <ExpandableList expandedId={null} onToggle={() => {}}>
          <ExpandableItem
            title="Collapsed item"
            isExpanded={false}
            onToggle={() => {}}
          >
            <Text style={wrapperStyles.answerText}>Hidden content</Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>

      <Section title="Expanded State">
        <ExpandableList expandedId="expanded" onToggle={() => {}}>
          <ExpandableItem
            title="Expanded item"
            isExpanded={true}
            onToggle={() => {}}
          >
            <Text style={wrapperStyles.answerText}>
              This content is visible because the item is expanded.
            </Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>

      <Section title="With Custom Icons">
        <ExpandableList expandedId={null} onToggle={() => {}}>
          <ExpandableItem
            title="Plus/minus icons"
            isExpanded={false}
            onToggle={() => {}}
            collapsedIcon="plus"
            expandedIcon="minus"
          >
            <Text style={wrapperStyles.answerText}>Custom icon content</Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>

      <Section title="Without Border">
        <ExpandableList expandedId={null} onToggle={() => {}}>
          <ExpandableItem
            title="No border item"
            isExpanded={false}
            onToggle={() => {}}
            showBorder={false}
          >
            <Text style={wrapperStyles.answerText}>No border content</Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>

      <Section title="Interactive List">
        <ExpandableList
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        >
          <ExpandableItem
            title="Item 1"
            isExpanded={expandedId === '1'}
            onToggle={() =>
              setExpandedId(expandedId === '1' ? null : '1')
            }
          >
            <Text style={wrapperStyles.answerText}>Content 1</Text>
          </ExpandableItem>
          <ExpandableItem
            title="Item 2"
            isExpanded={expandedId === '2'}
            onToggle={() =>
              setExpandedId(expandedId === '2' ? null : '2')
            }
          >
            <Text style={wrapperStyles.answerText}>Content 2</Text>
          </ExpandableItem>
          <ExpandableItem
            title="Item 3"
            isExpanded={expandedId === '3'}
            onToggle={() =>
              setExpandedId(expandedId === '3' ? null : '3')
            }
            isLast
          >
            <Text style={wrapperStyles.answerText}>Content 3</Text>
          </ExpandableItem>
        </ExpandableList>
      </Section>
    </StoryWrapper>
  );
}

export const AllStates: Story = {
  render: () => <AllStatesShowcase />,
};

// ===========================================================================
// PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Playground Item',
    isExpanded: false,
    showBorder: true,
    isLast: false,
    animated: true,
    collapsedIcon: 'chevron-down',
    expandedIcon: 'chevron-up',
    children: (
      <Text style={wrapperStyles.answerText}>
        Use the controls to customize this expandable item.
      </Text>
    ),
  },
};
