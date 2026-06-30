import { useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { Filter, X } from 'lucide-react'
import { IconButton } from './ui/IconButton'
import { Segmented } from './ui/Segmented'
import { TodoozyLogo } from './TodoozyLogo'
import { useClickOutside } from '../hooks/useClickOutside'
import { getAvatarImageUrl } from '../utils/userProfileAvatars'

export type AppSectionMode = 'dashboards' | 'archive'

interface AppHeaderProps {
    user: User | null
    sectionMode: AppSectionMode
    onSectionModeChange: (nextMode: AppSectionMode) => void
    onOpenProfile?: () => void
    profileName?: string
    profileAvatarId?: string | null
    availableTags?: string[]
    selectedTags?: string[]
    onToggleTagFilter?: (tag: string) => void
    onRemoveTagFilter?: (tag: string) => void
    onLogout: () => void
    logoutLoading: boolean
}

const getTagToneClassName = (tag: string): string => {
    const palette = [
        'border-cyan-300/35 bg-cyan-400/15 text-cyan-100',
        'border-emerald-300/35 bg-emerald-400/15 text-emerald-100',
        'border-amber-300/35 bg-amber-400/15 text-amber-100',
        'border-rose-300/35 bg-rose-400/15 text-rose-100',
        'border-indigo-300/35 bg-indigo-400/15 text-indigo-100',
        'border-fuchsia-300/35 bg-fuchsia-400/15 text-fuchsia-100',
        'border-lime-300/35 bg-lime-400/15 text-lime-100',
    ]

    const hash = Array.from(tag).reduce((acc, char) => (acc + char.charCodeAt(0)) % palette.length, 0)
    return palette[hash]
}

export const AppHeader = ({
    user,
    sectionMode,
    onSectionModeChange,
    onOpenProfile,
    profileName,
    profileAvatarId,
    availableTags = [],
    selectedTags = [],
    onToggleTagFilter,
    onRemoveTagFilter,
    onLogout,
    logoutLoading,
}: AppHeaderProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isTagFilterOpen, setIsTagFilterOpen] = useState(false)
    const tagFilterRef = useRef<HTMLDivElement | null>(null)

    useClickOutside(tagFilterRef, () => setIsTagFilterOpen(false), { enabled: isTagFilterOpen })

    const sectionOptions: Array<{ value: AppSectionMode; label: string; testId: string }> = [
        { value: 'dashboards', label: 'Dashboards', testId: 'section-tab-dashboards' },
        { value: 'archive', label: 'Archive', testId: 'section-tab-archive' },
    ]

    const handleMobileSectionChange = (nextMode: AppSectionMode) => {
        onSectionModeChange(nextMode)
        setIsMobileMenuOpen(false)
    }

    const normalizedProfileName = profileName?.trim() ?? ''
    const showSavedProfile = normalizedProfileName.length > 0 && Boolean(profileAvatarId)
    const headerDisplayTitle = showSavedProfile ? normalizedProfileName : (user?.email ?? 'Signed user')
    const headerDisplaySubtitle = ''

    return (
        <header className="sticky top-0 left-0 z-50 border-b border-white/10 bg-slate-900/40 backdrop-blur-sm md:static">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-4 sm:px-5 sm:py-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
                <div className="flex items-center justify-between md:justify-self-start">
                    <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-3xl">
                        <TodoozyLogo className="size-6 sm:size-7 md:size-12" />
                        <span>Todoozy</span>
                    </h1>
                    {user ? (
                        <IconButton
                            variant="neutral"
                            size="lg"
                            label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="app-header-mobile-menu"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            className="size-9 rounded-full md:hidden"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                            </svg>
                        </IconButton>
                    ) : null}
                </div>

                {user ? (
                    <div
                        id="app-header-mobile-menu"
                        className={[
                            'min-w-0 items-center md:contents max-md:flex max-md:flex-col max-md:gap-3 max-md:rounded-xl max-md:border max-md:border-white/10 max-md:bg-slate-900/70 max-md:p-3',
                            isMobileMenuOpen ? '' : 'max-md:hidden',
                        ].join(' ')}
                    >
                        <div className="relative flex items-center gap-2 self-center md:justify-self-center">
                            <Segmented
                                value={sectionMode}
                                options={sectionOptions}
                                onChange={handleMobileSectionChange}
                                ariaLabel="Main sections"
                            />
                            <div ref={tagFilterRef} className="relative">
                                <IconButton
                                    variant="neutral"
                                    size="lg"
                                    label={isTagFilterOpen ? 'Close tag filters' : 'Open tag filters'}
                                    className="h-9! w-9! rounded-full! border-white/25 bg-slate-900/70"
                                    aria-expanded={isTagFilterOpen}
                                    aria-controls="header-tags-filter-popover"
                                    onClick={() => setIsTagFilterOpen((prev) => !prev)}
                                    data-testid="header-tag-filter-trigger"
                                >
                                    <Filter size={16} />
                                </IconButton>
                                {selectedTags.length > 0 && (
                                    <span
                                        className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-bold text-slate-900"
                                        data-testid="header-tag-filter-count"
                                    >
                                        {selectedTags.length}
                                    </span>
                                )}
                            </div>

                            {isTagFilterOpen && (
                                <div
                                    id="header-tags-filter-popover"
                                    className="absolute left-0 top-full z-50 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-white/15 bg-slate-900/95 p-3 shadow-xl shadow-slate-950/40 backdrop-blur"
                                    data-testid="header-tag-filter-popover"
                                >
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Filter by tags</p>
                                    {availableTags.length === 0 ? (
                                        <p className="text-xs text-slate-400" data-testid="header-tag-filter-empty">No tags yet</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableTags.map((tag) => {
                                                const selected = selectedTags.includes(tag)

                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${getTagToneClassName(tag)} ${selected ? 'ring-1 ring-white/40' : 'opacity-85 hover:opacity-100'}`}
                                                        onClick={() => onToggleTagFilter?.(tag)}
                                                        data-testid={`header-tag-option-${tag}`}
                                                        aria-pressed={selected}
                                                    >
                                                        <span>{tag}</span>
                                                        {selected && (
                                                            <span
                                                                role="button"
                                                                tabIndex={0}
                                                                className="inline-flex items-center"
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    onRemoveTagFilter?.(tag)
                                                                }}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                                        event.preventDefault()
                                                                        event.stopPropagation()
                                                                        onRemoveTagFilter?.(tag)
                                                                    }
                                                                }}
                                                                aria-label={`Remove tag ${tag} from filter`}
                                                                data-testid={`header-tag-remove-${tag}`}
                                                            >
                                                                <X size={11} />
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex min-w-0 items-center gap-1 md:justify-self-end md:gap-1">
                            <button
                                type="button"
                                className="flex min-w-0 max-w-64 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-white/5"
                                title={user.email ?? 'Signed user'}
                                onClick={() => {
                                    setIsMobileMenuOpen(false)
                                    onOpenProfile?.()
                                }}
                                data-testid="header-open-profile"
                            >
                                <img
                                    src={getAvatarImageUrl(showSavedProfile ? profileAvatarId : null)}
                                    alt=""
                                    aria-hidden="true"
                                    className="size-8 shrink-0 rounded-full border border-white/15 bg-slate-900/70"
                                />
                                <span className="min-w-0">
                                    <span className="block truncate text-xs text-cyan-200 sm:text-sm md:max-w-64 md:text-center">
                                        {headerDisplayTitle}
                                    </span>
                                    {headerDisplaySubtitle ? (
                                        <span className="block truncate text-[11px] text-slate-400 md:text-center">
                                            {headerDisplaySubtitle}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                            <IconButton
                                variant="danger"
                                size="lg"
                                onClick={() => {
                                    setIsMobileMenuOpen(false)
                                    onLogout()
                                }}
                                disabled={logoutLoading}
                                label="Log out"
                                title="Log out"
                                className="size-9 rounded-full"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l3-3m0 0-3-3m3 3H9" />
                                </svg>
                            </IconButton>
                        </div>
                    </div>
                ) : (
                    <span className="justify-self-end rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
                        Sync Ready
                    </span>
                )}
            </div>
        </header>
    )
}
