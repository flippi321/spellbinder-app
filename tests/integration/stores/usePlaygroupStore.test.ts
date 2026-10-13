import { setRepos, type Repos } from '@/data';
import { usePlaygroupStore } from '@/stores/usePlaygroupStore';
import type { Game, GameNight } from '@/types';

const logGame = jest.fn(async (game: Omit<Game, 'id'>): Promise<Game> => ({ id: 'g1', ...game }));
const fakeRepos = { playgroup: { logGame } } as unknown as Repos;

const night = (startsAt: Date): GameNight => ({
  id: 'gn1',
  playgroupId: 'pg',
  startsAt: startsAt.toISOString(),
  location: "Jonas's",
  notes: null,
});
const hours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000);

beforeEach(() => {
  jest.clearAllMocks();
  setRepos(fakeRepos);
  usePlaygroupStore.setState({
    playgroup: { id: 'pg', name: 'The Thursday Table', inviteCode: 'X', createdBy: 'jonas' },
    members: [],
    games: [],
    gameNight: null,
  });
});
afterAll(() => setRepos(null));

describe('logging a game', () => {
  it('attaches the game night that started two hours ago', async () => {
    usePlaygroupStore.setState({ gameNight: night(hours(-2)) });
    await usePlaygroupStore.getState().logGame('mira');
    expect(logGame).toHaveBeenCalledWith(expect.objectContaining({ winnerId: 'mira', gameNightId: 'gn1' }));
    expect(usePlaygroupStore.getState().games).toEqual([expect.objectContaining({ gameNightId: 'gn1' })]);
  });

  it('leaves it out when the next game night is days away', async () => {
    usePlaygroupStore.setState({ gameNight: night(hours(72)) });
    await usePlaygroupStore.getState().logGame('mira');
    expect(logGame).toHaveBeenCalledWith(expect.objectContaining({ gameNightId: null }));
  });

  it('leaves it out without a game night', async () => {
    await usePlaygroupStore.getState().logGame('mira');
    expect(logGame).toHaveBeenCalledWith(expect.objectContaining({ gameNightId: null }));
  });

  it('logs nothing outside a playgroup', async () => {
    usePlaygroupStore.setState({ playgroup: null });
    await usePlaygroupStore.getState().logGame('mira');
    expect(logGame).not.toHaveBeenCalled();
  });
});
