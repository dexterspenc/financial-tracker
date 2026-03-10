import { TrendingUp, Building2, BarChart2, Target, FileText, Bot } from 'lucide-react';
import './AnalyticsTabs.css';

const TABS = [
  { id: 'overview', label: 'Overview',  Icon: TrendingUp  },
  { id: 'accounts', label: 'Accounts',  Icon: Building2   },
  { id: 'trends',   label: 'Trends',    Icon: BarChart2   },
  { id: 'budget',   label: 'Budget',    Icon: Target      },
  { id: 'reports',  label: 'Reports',   Icon: FileText    },
  { id: 'ai',       label: 'AI Advisor',Icon: Bot         },
];

function AnalyticsTabs({ activeTab, onTabChange }) {
  return (
    <div className="analytics-tabs" role="tablist">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          className={`tab-btn ${activeTab === id ? 'active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          <Icon size={15} strokeWidth={activeTab === id ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export default AnalyticsTabs;
