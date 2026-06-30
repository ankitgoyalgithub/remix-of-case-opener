import {
    LayoutDashboard, Inbox, User, Settings as SettingsIcon,
    Gauge, Workflow, FileStack, ClipboardCheck, FileSpreadsheet,
    Plug, Mails, ScrollText, Mail, SlidersHorizontal,
    type LucideIcon,
} from 'lucide-react';

/**
 * SINGLE SOURCE OF TRUTH for the app's left-nav.
 *
 * One persistent nav, three plain-language groups (Work · Configuration ·
 * Account). The desktop rail (Sidebar), the mobile drawer (MobileNav) and the
 * command palette all read from this list so the vocabulary stays identical
 * everywhere. Labels are deliberately jargon-free (the old "AI Studio /
 * Workflows / Census rulebooks / Jobs" became "Configuration / Review stages /
 * Employee-list rules / Email log").
 */

export type Role = 'admin' | 'operator' | 'viewer';

export interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;
    /** One-line plain-language helper (tooltip / drawer sub-label). */
    description: string;
    /** Match child routes too (e.g. /requests also lights up under /request/:id). */
    matchPrefixes?: string[];
    /** Workspace-rules-style item that only admins may open. */
    adminOnly?: boolean;
}

export interface NavGroup {
    id: 'work' | 'configuration' | 'account';
    label: string;
    items: NavItem[];
    /** When true, the whole group is hidden from viewers (admin/operator only). */
    configuration?: boolean;
}

const WORK: NavGroup = {
    id: 'work',
    label: 'Work',
    items: [
        { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard, description: 'What needs your attention today' },
        {
            to: '/requests', label: 'Requests', icon: Inbox,
            description: 'Every request and where it stands',
            matchPrefixes: ['/requests', '/request/'],
        },
    ],
};

const CONFIGURATION: NavGroup = {
    id: 'configuration',
    label: 'Configuration',
    configuration: true,
    items: [
        { to: '/studio', label: 'Overview', icon: Gauge, description: 'Setup health and quick links' },
        { to: '/studio/workflows', label: 'Review stages', icon: Workflow, description: 'The steps each request moves through' },
        { to: '/studio/documents', label: 'Documents & data capture', icon: FileStack, description: 'Document types and what we read from them' },
        { to: '/studio/checks', label: 'Validation checks', icon: ClipboardCheck, description: 'Rules that flag problems automatically' },
        { to: '/studio/census-rulebooks', label: 'Employee-list rules', icon: FileSpreadsheet, description: 'How employee lists are checked' },
        { to: '/studio/inbound', label: 'Incoming email', icon: Mails, description: 'Mailboxes that turn emails into requests' },
        { to: '/studio/jobs', label: 'Email log', icon: ScrollText, description: 'What happened to each received email' },
        { to: '/studio/messages', label: 'Email templates', icon: Mail, description: 'Standard emails sent to brokers' },
        { to: '/studio/integrations', label: 'Connected services', icon: Plug, description: 'Outside services this workspace uses' },
        { to: '/studio/settings', label: 'Workspace rules', icon: SlidersHorizontal, description: 'Deadlines, teams and roles', adminOnly: true },
    ],
};

const ACCOUNT: NavGroup = {
    id: 'account',
    label: 'Account',
    items: [
        { to: '/profile', label: 'My profile', icon: User, description: 'Your name and contact details' },
        { to: '/settings', label: 'Preferences', icon: SettingsIcon, description: 'Theme and personal options' },
    ],
};

const ALL_GROUPS: NavGroup[] = [WORK, CONFIGURATION, ACCOUNT];

/**
 * Hide the Configuration group from viewers. Admin/operator see it.
 *
 * Fail-safe: when the role is still loading or the backend hasn't sent one yet
 * (role === undefined), we DEFAULT TO SHOWING so we never lock an admin out of
 * setup during a transient fetch. The only role we actively hide for is the
 * known "viewer".
 * TODO(Phase B): once /user/me reliably returns a role, switch this to a strict
 * allowlist (role === 'admin' || role === 'operator').
 */
export function canSeeConfiguration(role?: Role | string): boolean {
    return role !== 'viewer';
}

/** Workspace-rules-style admin-only items: hidden from operator and viewer. */
export function canSeeAdminItem(role?: Role | string): boolean {
    return role !== 'operator' && role !== 'viewer';
}

/** Build the nav groups visible to a given role (filters group + admin items). */
export function getNavGroups(role?: Role | string): NavGroup[] {
    return ALL_GROUPS
        .filter(g => (g.configuration ? canSeeConfiguration(role) : true))
        .map(g => ({
            ...g,
            items: g.items.filter(i => (i.adminOnly ? canSeeAdminItem(role) : true)),
        }));
}

/** Is a nav item the active route for the current pathname? */
export function isItemActive(item: NavItem, pathname: string): boolean {
    if (item.matchPrefixes) {
        return item.matchPrefixes.some(p => pathname === p || pathname.startsWith(p));
    }
    if (item.to === '/dashboard') {
        return pathname === '/' || pathname.startsWith('/dashboard');
    }
    if (item.to === '/studio') {
        return pathname === '/studio' || pathname === '/studio/';
    }
    if (item.to === '/settings') {
        // Don't let account "Preferences" light up for /studio/settings.
        return pathname === '/settings';
    }
    return pathname === item.to || pathname.startsWith(item.to + '/');
}

/** Flat label lookup keyed by route — used by breadcrumbs to stay in sync. */
export const ROUTE_LABELS: Record<string, string> = Object.fromEntries(
    ALL_GROUPS.flatMap(g => g.items.map(i => [i.to, i.label])),
);
