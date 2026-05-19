import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WhatsAppGroupSection } from './WhatsAppGroupSection';
import { openWhatsAppGroup } from '@/utils/whatsapp';

// isValidWhatsAppInvite is intentionally left un-mocked so the real regex runs;
// only openWhatsAppGroup is stubbed.
jest.mock('@/utils/whatsapp', () => {
  const actual = jest.requireActual('@/utils/whatsapp');
  return {
    ...actual,
    openWhatsAppGroup: jest.fn(),
  };
});

const validUrl = 'https://chat.whatsapp.com/AbCdEfGhIjKl';

describe('WhatsAppGroupSection', () => {
  beforeEach(() => {
    (openWhatsAppGroup as jest.Mock).mockReset();
  });

  it('renders nothing when viewer is not a player', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection whatsappUrl={validUrl} isPlayer={false} />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders nothing when whatsappUrl is null', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection whatsappUrl={null} isPlayer={true} />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders nothing when whatsappUrl is an empty string', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection whatsappUrl="" isPlayer={true} />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders nothing when whatsappUrl is not a valid WhatsApp invite', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection
        whatsappUrl="https://example.com/group"
        isPlayer={true}
      />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders the join row when player + valid url', () => {
    const { getByTestId, getByText } = render(
      <WhatsAppGroupSection whatsappUrl={validUrl} isPlayer={true} />,
    );
    expect(getByTestId('whatsapp-group-join')).toBeTruthy();
    expect(getByText('Join WhatsApp Group')).toBeTruthy();
  });

  it('opens WhatsApp when the row is pressed', () => {
    const { getByTestId } = render(
      <WhatsAppGroupSection whatsappUrl={validUrl} isPlayer={true} />,
    );
    fireEvent.press(getByTestId('whatsapp-group-join'));
    expect(openWhatsAppGroup).toHaveBeenCalledTimes(1);
    expect(openWhatsAppGroup).toHaveBeenCalledWith(validUrl);
  });
});
