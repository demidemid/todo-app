import { useState } from 'react'
import type { User } from 'firebase/auth'
import { IconButton } from './ui/IconButton'
import { Segmented } from './ui/Segmented'
import { TodoozyLogo } from './TodoozyLogo'

export type AppSectionMode = 'dashboards' | 'archive'

interface AppHeaderProps {
    user: User | null
    sectionMode: AppSectionMode
    onSectionModeChange: (nextMode: AppSectionMode) => void
    onLogout: () => void
    logoutLoading: boolean
}

export const AppHeader = ({
    user,
    sectionMode,
    onSectionModeChange,
    onLogout,
    logoutLoading,
}: AppHeaderProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const sectionOptions: Array<{ value: AppSectionMode; label: string; testId: string }> = [
        { value: 'dashboards', label: 'Dashboards', testId: 'section-tab-dashboards' },
        { value: 'archive', label: 'Archive', testId: 'section-tab-archive' },
    ]

    const handleMobileSectionChange = (nextMode: AppSectionMode) => {
        onSectionModeChange(nextMode)
        setIsMobileMenuOpen(false)
    }

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
                        <Segmented
                            value={sectionMode}
                            options={sectionOptions}
                            onChange={handleMobileSectionChange}
                            ariaLabel="Main sections"
                            className="self-center md:justify-self-center"
                        />
                        <div className="flex min-w-0 items-center gap-1 md:justify-self-end md:gap-1">
                            <p className="min-w-0 truncate text-xs text-slate-200 sm:text-sm md:max-w-64 md:text-right" title={user.email ?? 'Signed user'}>
                                {user.email ?? 'Signed user'}
                            </p>
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
