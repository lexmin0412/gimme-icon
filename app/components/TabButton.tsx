type TabType = "vectorModel" | "iconLibraries" | "vectorStore";

interface TabButtonProps {
  tab: TabType;
  label: string;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
}

export default function TabButton({ tab, label, activeTab, onClick }: TabButtonProps) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`block w-full text-left px-4 py-3 cursor-pointer text-sm ${activeTab === tab
        ? 'bg-white dark:bg-gray-800 border-l-4 border-blue-500'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}
