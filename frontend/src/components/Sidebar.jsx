import React, { useEffect, useState } from 'react';
import {
  Database,
  Cpu,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Wrench,
  Package,
  ClipboardList,
  Layers,
  LogOut,
  Activity,
  FileSpreadsheet,
  ShoppingCart,
} from 'lucide-react';
import autocratLogo from '../assets/autocrat-logo.png';
import autocratFullLogo from '../assets/autocrat-engineers-logo.png';

const logo = autocratLogo;

export default function Sidebar({
  activeModule,
  setActiveModule,
  isOpen,
  setIsOpen,
}) {
  // Accordion: only one section open at a time.
  // Keep the section containing the active module open automatically.
  const getSectionForModule = (module) => {
    if (['wo-planning', 'stock-order-planning', 'stock-alloc'].includes(module)) {
      return 'ppc';
    }

    if (module === 'prod-order') return 'orders';
    if (module === 'prod-execution') return 'production';

    if (['rm-quality', 'prod-quality', 'final-quality'].includes(module)) {
      return 'quality';
    }

    if (['item-master', 'machine-master', 'tools-master'].includes(module)) {
      return 'inventory';
    }
    return null;
  };

  const [expandedSection, setExpandedSection] = useState(
    getSectionForModule(activeModule) || 'orders'
  );

  useEffect(() => {
    const section = getSectionForModule(activeModule);
    if (section) {
      setExpandedSection(section);
    }
  }, [activeModule]);

  const handleModuleChange = (moduleId) => {
    setActiveModule(moduleId);

    const section = getSectionForModule(moduleId);
    if (section) {
      setExpandedSection(section);
    }

    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const standaloneItems = [{
    id: 'rdbms-explorer',
    label: 'WebApp Database',
    icon: Database,
  },];

  const dropdownSections = [
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      subItems: [
        { id: 'item-master', label: 'Item Master', icon: Package },
        { id: 'machine-master', label: 'Machine Master', icon: Cpu },
        { id: 'tools-master', label: 'Tools Master', icon: Wrench },
      ],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingCart,
      subItems: [
        {
          id: 'prod-order',
          label: 'Sale Orders List',
          icon: ClipboardList,
        },
      ],
    },
    {
      id: 'ppc',
      label: 'PPC',
      icon: FileSpreadsheet,
      subItems: [
        {
          id: 'wo-planning',
          label: 'Sale Order Planning',
          icon: ClipboardList,
        },
        {
          id: 'stock-order-planning',
          label: 'Stock Order Planning',
          icon: Activity,
        },
        {
          id: 'stock-alloc',
          label: 'Stock Allocation',
          icon: Layers,
        },
      ],
    },
    {
      id: 'production',
      label: 'Production',
      icon: Cpu,
      subItems: [
        {
          id: 'prod-execution',
          label: 'Production Execution',
          icon: Activity,
        },
      ],
    },
    {
      id: 'quality',
      label: 'Quality',
      icon: ShieldCheck,
      subItems: [
        { id: 'rm-quality', label: 'RM Quality', icon: ShieldCheck },
        { id: 'prod-quality', label: 'Production Quality', icon: Award },
        { id: 'final-quality', label: 'Final Quality', icon: ShieldCheck },
      ],
    },
  ];

  const labelClass = (extra = '') =>
    `overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${isOpen ? 'max-w-[160px] opacity-100 ml-0.5' : 'max-w-0 opacity-0 ml-0'
    } ${extra}`;

  return (
    <>
      {/* Mobile top header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#484f4f] text-white flex items-center justify-between px-4 z-30 border-b border-[#deeaee]/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-[#5b6666] text-slate-200 focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-bold text-sm tracking-wider">AUTOCRAT</span>
        </div>
        <img src={logo} alt="Autocrat" className="h-8 w-auto object-contain" />
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`sticky inset-y-0 left-0 z-40 ${isOpen ? 'w-64' : 'w-20 hidden lg:flex'
          } h-screen bg-[#484f4f] text-slate-300 transition-all duration-300 ease-in-out flex flex-col justify-between`}
        id="autocrat-sidebar"

        onMouseEnter={() => {
          if (window.innerWidth >= 1024) setIsOpen(true);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setIsOpen(false);
        }}
      >
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Logo */}
          <div
            className={`relative border-b border-[#deeaee] overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'h-24' : 'h-16'
              }`}
          >
            <img
              src={logo}
              alt="Autocrat Logo"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-10 object-contain transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
            />
            <img
              src={autocratFullLogo}
              alt="Autocrat Engineers"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-auto max-w-[200px] object-contain transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />
          </div>

          <nav className="p-4 space-y-1.5 flex-1">
            {/* 1. WebApp Database */}
            {standaloneItems.map((item) => (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    handleModuleChange(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-[#5b6666] hover:text-white ${activeModule === item.id ? 'bg-[#211456] text-white' : ''
                    }`}
                  id={`sidebar-item-${item.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="w-5 h-5 shrink-0 transition-transform duration-300" />
                    <span className={labelClass()}>{item.label}</span>
                  </div>
                </button>
              </div>
            ))}

            {/* 2–5. Orders → PPC → Production → Quality */}
            {dropdownSections.map((section) => {
              const isExpanded = expandedSection === section.id;
              const isSectionActive = section.subItems.some(
                (sub) => sub.id === activeModule
              );

              return (
                <div key={section.id} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-[#5b6666] hover:text-white ${isSectionActive ? 'text-white font-bold' : 'text-slate-300'
                      }`}
                    id={`sidebar-item-${section.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <section.icon className="w-4.5 h-4.5 shrink-0 text-slate-400" />
                      <span className={labelClass()}>{section.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp
                        className={labelClass('w-4 h-4 text-slate-400 shrink-0')}
                      />
                    ) : (
                      <ChevronDown
                        className={labelClass('w-4 h-4 text-slate-400 shrink-0')}
                      />
                    )}
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen && isExpanded
                      ? 'max-h-96 opacity-100 mt-1'
                      : 'max-h-0 opacity-0'
                      }`}
                  >
                    <div
                      className="pl-6 space-y-1 border-l border-[#2e2365] ml-5"
                      id={`${section.id}-submenu`}
                    >
                      {section.subItems.map((sub) => {
                        const isActive = activeModule === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              handleModuleChange(sub.id);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${isActive
                              ? 'bg-[#5b6666] text-white shadow-sm border-l-2 border-[#deeaee]'
                              : 'text-slate-300 hover:bg-[#5b6666] hover:text-white'
                              }`}
                            id={`sidebar-subitem-${sub.id}`}
                          >
                            <sub.icon
                              className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#deeaee]' : 'text-slate-400'
                                }`}
                            />
                            <span className="whitespace-nowrap">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User profile */}
        <div className="p-4 border-t border-[#e0e2e4] bg-[#484f4f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white shadow-sm text-sm shrink-0">
              A
            </div>
            <div className={labelClass('min-w-0 flex-1')}>
              <div className="text-xs font-bold text-slate-200 truncate">
                ADMIN
              </div>
              <div className="text-[10px] text-slate-200 font-mono">
                ID: ROBOT
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/login';
              }}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${isOpen
                ? 'max-w-[110px] opacity-100'
                : 'max-w-0 opacity-0 pointer-events-none px-0'
                }`}
              title="Log Out"
            >
              <span className="whitespace-nowrap">Log Out</span>
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}