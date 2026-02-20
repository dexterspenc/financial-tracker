import './AnalyticsTabs.css';

function AnalyticsTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'overview', label: '📈 Overview' },
    { id: 'accounts', label: '🏦 Accounts' },
    { id: 'trends', label: '📊 Trends' },
    { id: 'budget', label: '💰 Budget' },  // ← REMOVED badge!
    { id: 'reports', label: '📄 Reports' }  // Remove badge!
  ];

  return (
    <div className="analytics-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.badge ? 'disabled' : ''}`}
          onClick={() => !tab.badge && onTabChange(tab.id)}
          disabled={tab.badge}
        >
          <span className="tab-label">{tab.label}</span>
          {tab.badge && <span className="tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export default AnalyticsTabs;