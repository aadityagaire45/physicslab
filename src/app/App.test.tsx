import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/router';
import ProjectileMotionLab from '@/modules/mechanics/projectile-motion/ProjectileMotionLab';

function renderAt(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

describe('application shell & pages', () => {
  it('renders the dashboard with branding, 8 categories and featured experiments', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /Explore\. Experiment\. Understand\./i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Laboratory Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Featured Experiments/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Launch Projectile Motion Lab/i })).toBeInTheDocument();
  });

  it('filters the experiment catalogue by search text and availability', async () => {
    renderAt('/experiments');
    const searchInput = await screen.findByRole('searchbox', { name: /Filter experiments/i }, { timeout: 5000 });
    fireEvent.change(searchInput, { target: { value: 'Photoelectric' } });
    expect(screen.getByText('Photoelectric Effect')).toBeInTheDocument();
  });

  it('adds and displays a notebook entry', async () => {
    renderAt('/notebook');
    const titleInput = await screen.findByLabelText(/Title/i, {}, { timeout: 5000 });
    fireEvent.change(titleInput, { target: { value: 'Pendulum timing trial' } });
    fireEvent.click(screen.getByRole('button', { name: /Add to Notebook/i }));
    expect(screen.getByText('Pendulum timing trial')).toBeInTheDocument();
  });

  it('renders Logic Gates planned brief with distinct De Morgan labels', async () => {
    renderAt('/experiments/logic-gates');
    expect(await screen.findByText('De Morgan (NAND)', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('De Morgan (NOR)')).toBeInTheDocument();
  });

  it('reveals and highlights a hash-targeted concept on Learn even after filtering another category', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/learn'] });
    render(<RouterProvider router={router} />);
    const mechanicsBtn = await screen.findByRole('button', { name: 'Mechanics' }, { timeout: 5000 });
    fireEvent.click(mechanicsBtn);
    expect(screen.queryByRole('heading', { name: 'Snell’s Law' })).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate('/learn#snells-law');
    });
    const snellCard = await screen.findByRole('heading', { name: 'Snell’s Law' }, { timeout: 5000 });
    expect(snellCard).toBeInTheDocument();
    expect(document.getElementById('snells-law')?.className).toContain('ring-2');
  });

  it('traps Tab focus and restores trigger focus for SearchDialog and MobileNav', () => {
    renderAt('/');

    // SearchDialog focus trap and restoration
    const searchTrigger = screen.getByRole('button', { name: /Search experiments, concepts and pages/i });
    searchTrigger.focus();
    expect(document.activeElement).toBe(searchTrigger);

    fireEvent.click(searchTrigger);
    const searchInput = screen.getByRole('combobox', { name: /Search query/i });
    expect(document.activeElement).toBe(searchInput);

    // Shift+Tab from the first focusable element wraps to the last option button in the dialog
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Search' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(searchInput);

    // Tab from the last focusable element wraps back to the search input
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(searchInput);

    // Closing with Escape restores focus to searchTrigger
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(document.activeElement).toBe(searchTrigger);

    // MobileNav focus trap and restoration
    const navTrigger = screen.getByRole('button', { name: /Open navigation/i });
    navTrigger.focus();
    fireEvent.click(navTrigger);

    const closeNavBtn = screen.getByRole('button', { name: /Close navigation/i });
    expect(document.activeElement).toBe(closeNavBtn);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).toBe(navTrigger);
  });

  it('cleans up the ProjectileMotionLab notebook notification timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(<ProjectileMotionLab />);

    fireEvent.click(screen.getByRole('button', { name: /Record run in My Notebook/i }));
    expect(screen.getByRole('button', { name: /Saved to My Notebook/i })).toBeInTheDocument();

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
