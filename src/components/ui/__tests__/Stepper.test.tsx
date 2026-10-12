import { fireEvent, render, screen } from '@testing-library/react-native';

import { Stepper } from '../Stepper';

describe('Stepper', () => {
  it('steps within bounds and labels its buttons', async () => {
    const onChange = jest.fn();
    await render(<Stepper value={1} min={0} max={2} onChange={onChange} label="copies in binder" />);

    await fireEvent.press(screen.getByLabelText('Increase copies in binder'));
    expect(onChange).toHaveBeenLastCalledWith(2);

    await fireEvent.press(screen.getByLabelText('Decrease copies in binder'));
    expect(onChange).toHaveBeenLastCalledWith(0);

    expect(screen.getByLabelText('copies in binder: 1')).toBeTruthy();
  });
});
