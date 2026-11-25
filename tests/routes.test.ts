import { describe, expect, it } from 'vitest';
import { pathToTab, TAB_TO_PATH, type NavTab } from '../src/routes.js';

describe('Page Routing', () => {
  it('round-trips all 5 navigation tabs and handles trailing slashes and fallbacks', () => {
    const tabs: NavTab[] = ['dashboard', 'analytics', 'input', 'table', 'settings'];
    for (const tab of tabs) {
      const route = TAB_TO_PATH[tab];
      expect(pathToTab(route)).toBe(tab);
      expect(pathToTab(`${route}/`)).toBe(tab);
    }

    expect(pathToTab('/')).toBeNull();
    expect(pathToTab('/login')).toBeNull();
    expect(pathToTab('/unknown-path')).toBeNull();
  });
});
