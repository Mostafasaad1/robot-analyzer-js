/**
 * Tab Navigation Component - Modern tab-based sidebar navigation
 */



interface Tab {
  id: string;
  title: string;
  icon: string;
  accentColor: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          style={
            activeTab === tab.id
              ? { '--tab-accent': tab.accentColor } as React.CSSProperties
              : undefined
          }
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-title">{tab.title}</span>
          {activeTab === tab.id && <span className="tab-indicator" />}
        </button>
      ))}
    </div>
  );
}

export default TabNavigation;
