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
    const sectionOptions: Array<{ value: AppSectionMode; label: string; testId: string }> = [
        { value: 'dashboards', label: 'Dashboards', testId: 'section-tab-dashboards' },
        { value: 'archive', label: 'Archive', testId: 'section-tab-archive' },
    ]

    return (
        <header className="border-b border-white/10 bg-slate-900/40 backdrop-blur-sm">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-6">
                <div className="justify-self-start">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                        <TodoozyLogo className="size-7 md:size-12" />
                        <span>Todoozy</span>
                    </h1>
                </div>

                {user ? (
                    <>
                        <Segmented
                            value={sectionMode}
                            options={sectionOptions}
                            onChange={onSectionModeChange}
                            ariaLabel="Main sections"
                        />
                        <div className="flex items-center justify-self-end gap-3">
                            <p className="max-w-44 truncate text-sm text-slate-200 md:max-w-64" title={user.email ?? 'Signed user'}>
                                {user.email ?? 'Signed user'}
                            </p>
                            <IconButton
                                variant="danger"
                                size="lg"
                                onClick={onLogout}
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
                    </>
                ) : (
                    <span className="justify-self-end rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
                        Sync Ready
                    </span>
                )}
            </div>
        </header>
    )
}
