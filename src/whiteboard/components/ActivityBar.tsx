interface ActivityBarProps {
  sidebarTab: string | null;
  onTabChange: (tab: string) => void;
}

export function ActivityBar({ sidebarTab, onTabChange }: ActivityBarProps) {
  return (
    <nav className="vsc-actbar" aria-label="Activity bar">
      <button
        type="button"
        className={`vsc-actbar-item${sidebarTab === "toolbox" ? " active" : ""}`}
        title="Toolbox"
        onClick={() => onTabChange("toolbox")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </button>
      <div className="vsc-actbar-sep" />
      <button
        type="button"
        className={`vsc-actbar-item${sidebarTab === "chat" ? " active" : ""}`}
        title="Chat"
        onClick={() => onTabChange("chat")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
        </svg>
      </button>
    </nav>
  );
}
