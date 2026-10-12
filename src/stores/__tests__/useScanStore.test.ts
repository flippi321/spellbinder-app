import { setRepos, type Repos } from '@/data';
import { resetRecognizer } from '@/services/scan';
import type { Card, Deck } from '@/types';

import { useCollectionStore } from '../useCollectionStore';
import { useDeckStore } from '../useDeckStore';
import { useScanStore } from '../useScanStore';
import { useSessionStore } from '../useSessionStore';

const makeCard = (name: string): Card => ({
  id: `print-${name}`,
  oracle_id: `oracle-${name}`,
  name,
  layout: 'normal',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  legalities: { commander: 'legal' },
  set: 'tst',
  collector_number: '1',
  rarity: 'uncommon',
});

const atraxa: Deck = {
  id: 'deck-atraxa',
  ownerId: 'me',
  name: "Atraxa, Praetors' Voice",
  commanderOracleId: 'oracle-Atraxa',
  partnerOracleId: null,
  theme: '',
  bracket: 3,
  createdAt: '',
  cards: [{ oracleId: 'oracle-Atraxa', quantity: 1, category: 'Commander', isCommander: true }],
};

const findByName = jest.fn(async (name: string) => (name === 'Nothing' ? null : makeCard(name)));
const upsertItem = jest.fn(async <T>(item: T) => item);
const upsertDeckCard = jest.fn(async () => undefined);

const fakeRepos = {
  cards: { findByName, save: jest.fn(async () => undefined) },
  collection: { upsert: upsertItem },
  decks: { upsertCard: upsertDeckCard },
} as unknown as Repos;

beforeEach(() => {
  jest.clearAllMocks();
  resetRecognizer();
  setRepos(fakeRepos);
  useSessionStore.setState({ status: 'signedIn', user: { id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'gold' } });
  useCollectionStore.setState({ items: [], seeded: true });
  useDeckStore.setState({ decks: [atraxa], seeded: true });
  useScanStore.getState().endSession();
  useScanStore.getState().setDestination({ kind: 'binder' });
});

afterAll(() => setRepos(null));

describe('scan flow', () => {
  it('captures, confirms and adds to the binder, then returns to scanning', async () => {
    const scan = useScanStore.getState;
    expect(scan().status).toBe('scanning');

    await scan().capture('file:///photo.jpg');
    expect(findByName).toHaveBeenCalledWith('Sol Ring', { fuzzy: true });
    expect(scan()).toMatchObject({ status: 'matched', match: { confidence: 0.98 }, foil: false, quantity: 1 });
    expect(scan().match?.card.name).toBe('Sol Ring');

    scan().toggleFoil();
    scan().setQuantity(2);
    await scan().confirmAdd();

    const [item] = useCollectionStore.getState().items;
    expect(item).toMatchObject({ scryfallId: 'print-Sol Ring', oracleId: 'oracle-Sol Ring', quantity: 2, foil: true });
    expect(upsertItem).toHaveBeenCalledTimes(1);

    expect(scan()).toMatchObject({ status: 'scanning', match: null, foil: false, quantity: 1 });
    expect(scan().toast?.message).toBe('Added 2× Sol Ring');
    expect(scan().session).toHaveLength(1);
    expect(scan().session[0]).toMatchObject({ quantity: 2, foil: true, destination: { kind: 'binder' } });
  });

  it('merges repeat scans of the same printing into one stack', async () => {
    const scan = useScanStore.getState;
    await scan().capture(null);
    await scan().confirmAdd();
    resetRecognizer();
    await scan().capture(null);
    await scan().confirmAdd();

    expect(useCollectionStore.getState().items).toEqual([expect.objectContaining({ quantity: 2, foil: false })]);
    expect(scan().session).toHaveLength(2);
  });

  it('adds to a deck by oracle id when the destination is a deck', async () => {
    const scan = useScanStore.getState;
    scan().setDestination({ kind: 'deck', deckId: atraxa.id });
    await scan().capture(null);
    await scan().confirmAdd();

    const deck = useDeckStore.getState().decks[0];
    expect(deck.cards.map((c) => c.oracleId)).toContain('oracle-Sol Ring');
    expect(upsertDeckCard).toHaveBeenCalled();
    expect(useCollectionStore.getState().items).toHaveLength(0);
    expect(scan().toast?.message).toBe('Added Sol Ring to Atraxa');
  });

  it('shows an error when nothing matches, and rescan clears it', async () => {
    findByName.mockResolvedValueOnce(null);
    const scan = useScanStore.getState;
    await scan().capture(null);
    expect(scan().status).toBe('error');
    expect(scan().error).toMatch(/No card matched/);

    scan().rescan();
    expect(scan()).toMatchObject({ status: 'scanning', error: null });
  });

  it('accepts a manually typed card', () => {
    useScanStore.getState().selectCard(makeCard('Counterspell'));
    expect(useScanStore.getState()).toMatchObject({ status: 'matched', match: { confidence: 1 } });
  });
});
