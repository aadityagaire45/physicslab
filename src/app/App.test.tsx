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

  it('renders the interactive Simple Pendulum Lab at /experiments/simple-pendulum and logs measurements to My Notebook', async () => {
    renderAt('/experiments/simple-pendulum');
    expect(await screen.findByText('Pendulum Apparatus', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByLabelText('Simple pendulum simulation canvas')).toBeInTheDocument();
    expect(screen.getByText('Small-angle period T₀')).toBeInTheDocument();
    expect(screen.getByText('Exact undamped period T')).toBeInTheDocument();
    expect(screen.getByText('RK4 measured period T_sim')).toBeInTheDocument();

    // Switch to the Large (150°) release angle preset and verify anharmonic period shift updates
    fireEvent.click(screen.getByRole('button', { name: /150° \(Large\)/i }));
    expect(screen.getByText(/\+76\.2% vs small-angle/i)).toBeInTheDocument();

    // Record run in My Notebook
    fireEvent.click(screen.getByRole('button', { name: /Record run in My Notebook/i }));
    expect(screen.getByRole('button', { name: /Saved to My Notebook/i })).toBeInTheDocument();
  });

  it('renders the interactive Spring–Mass Oscillator Lab at /experiments/spring-mass-oscillator and switches regimes and graphs', async () => {
    renderAt('/experiments/spring-mass-oscillator');
    expect(await screen.findByText('Vertical Spring–Mass Apparatus', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByLabelText('Vertical spring-mass oscillator simulation canvas')).toBeInTheDocument();
    expect(screen.getByText('Angular frequency ω₀')).toBeInTheDocument();
    expect(screen.getByText('Damping ratio ζ')).toBeInTheDocument();

    // Switch to Critical damping preset (ζ = 1) and verify damped frequency becomes Non-oscillatory
    fireEvent.click(screen.getByRole('button', { name: /Critical damping/i }));
    expect(screen.getByText('Non-oscillatory')).toBeInTheDocument();

    // Step simulation forward and switch kinematic & energy graph tabs
    fireEvent.click(screen.getByRole('button', { name: /^Step$/i }));
    fireEvent.click(screen.getByRole('radio', { name: /v\(t\) Velocity/i }));
    fireEvent.click(screen.getByRole('radio', { name: /a\(t\) Acceleration/i }));
    fireEvent.click(screen.getByRole('radio', { name: /K\(t\) Kinetic/i }));
    fireEvent.click(screen.getByRole('radio', { name: /U\(t\) Potential/i }));
    fireEvent.click(screen.getByRole('radio', { name: /E\(t\) Total Mechanical/i }));

    // Record run in My Notebook
    fireEvent.click(screen.getByRole('button', { name: /Record run in My Notebook/i }));
    expect(screen.getByRole('button', { name: /Saved to My Notebook/i })).toBeInTheDocument();
  });

  it('renders the interactive Inclined Plane Lab at /experiments/inclined-plane-friction and switches presets and graphs', async () => {
    renderAt('/experiments/inclined-plane-friction');
    expect(await screen.findByText('Inclined Plane & Free-Body Apparatus', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByLabelText('Inclined plane and friction simulation canvas')).toBeInTheDocument();
    expect(screen.getByText('Normal force N')).toBeInTheDocument();
    expect(screen.getByText('Critical angle θ_c')).toBeInTheDocument();

    // Switch to Rough plane preset (stationary)
    fireEvent.click(screen.getByRole('button', { name: /Rough plane/i }));
    expect(screen.getByText(/Stationary \(Static Equilibrium\)/i)).toBeInTheDocument();

    // Switch to Just at limiting equilibrium preset
    fireEvent.click(screen.getByRole('button', { name: /Just at limiting equilibrium/i }));
    expect(screen.getByText('Limiting Equilibrium (f_s = f_s,max)')).toBeInTheDocument();

    // Switch to Sliding block preset
    fireEvent.click(screen.getByRole('button', { name: /Sliding block/i }));
    expect(screen.getByText(/Sliding Downslope/i)).toBeInTheDocument();

    // Switch analysis tabs
    fireEvent.click(screen.getByRole('radio', { name: /Static vs Kinetic/i }));
    fireEvent.click(screen.getByRole('radio', { name: /Energy & Thermal Dissipation/i }));

    // Record run in My Notebook
    fireEvent.click(screen.getByRole('button', { name: /Record run in My Notebook/i }));
    expect(screen.getByRole('button', { name: /Saved to My Notebook/i })).toBeInTheDocument();
  });

  it('renders the interactive Collisions & Momentum Lab at /experiments/collisions-momentum and verifies presets and graphs', async () => {
    renderAt('/experiments/collisions-momentum');
    expect(await screen.findByText('1D Horizontal Collision Track', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByLabelText('One-dimensional collision track simulation canvas')).toBeInTheDocument();
    expect(screen.getByText('Initial momentum Pᵢ')).toBeInTheDocument();
    expect(screen.getByText('Final momentum P_f')).toBeInTheDocument();
    expect(screen.getByText('Energy lost ΔK_lost')).toBeInTheDocument();

    // Switch to Perfectly Inelastic preset and verify badge updates
    fireEvent.click(screen.getByRole('button', { name: /Equal masses, perfectly inelastic collision/i }));
    expect(screen.getByText('Perfectly Inelastic (e = 0, Coupled)')).toBeInTheDocument();

    // Switch to Two objects moving toward each other preset
    fireEvent.click(screen.getByRole('button', { name: /Two objects moving toward each other/i }));
    expect(screen.getByText('Partially Inelastic (e = 0.80)')).toBeInTheDocument();

    // Step forward and cycle through graph tabs
    fireEvent.click(screen.getByRole('button', { name: /^Step$/i }));
    fireEvent.click(screen.getByRole('radio', { name: /x\(t\) Position/i }));
    fireEvent.click(screen.getByRole('radio', { name: /p\(t\) Momentum/i }));
    fireEvent.click(screen.getByRole('radio', { name: /K\(t\) Kinetic Energy/i }));

    // Record run in My Notebook
    fireEvent.click(screen.getByRole('button', { name: /Record run in My Notebook/i }));
    expect(screen.getByRole('button', { name: /Saved to My Notebook/i })).toBeInTheDocument();
  });
});
