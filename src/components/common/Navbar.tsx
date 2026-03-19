import type { NavItem, UserTab } from '../../types';

interface NavbarProps {
  items: NavItem[];
  activeTab: UserTab;
  onSelect: (tab: NavItem['id']) => void;
}

const getVisualActiveTab = (tab: UserTab): NavItem['id'] => {
  if (tab === 'category_detail') {
    return 'borrow';
  }

  if (tab === 'history' || tab === 'change_password') {
    return 'user';
  }

  return tab as NavItem['id'];
};

export default function Navbar({ items, activeTab, onSelect }: NavbarProps) {
  const currentTab = getVisualActiveTab(activeTab);

  return (
    <div className="mb-10 flex justify-center animate-fade-up">
      <div className="systemhub-auth-tabs flex flex-wrap items-center justify-center gap-2 rounded-full p-2 backdrop-blur-xl shadow-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-2.5 rounded-full px-6 py-2.5 text-[13px] font-bold transition-all ${isActive ? 'bg-[var(--systemhub-primary)] text-white' : 'text-[var(--systemhub-text-subtle)] hover:text-white'}`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}