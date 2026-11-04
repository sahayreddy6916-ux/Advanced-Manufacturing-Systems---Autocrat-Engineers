import React, { useState, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';

export default function AutocompleteSelect({
  items,
  selectedCode,
  onChange,
  onClear,
  placeholder = "Search FG Item Code..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selectedItem = items.find(item => item.code === selectedCode);

  useEffect(() => {
    // Sync query text with selected item initially or when selection changes outside
    if (selectedItem) {
      setQuery(selectedItem.code);
    } else {
      setQuery("");
    }
  }, [selectedCode, selectedItem]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Revert query to selected item if closed without selecting
        if (selectedItem) {
          setQuery(selectedItem.code);
        } else {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem]);

  const filteredItems = query.trim() === ""
    ? items
    : items.filter(item =>
      item.code.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase())
    );

  const handleSelect = (item) => {
    onChange(item);
    setQuery(item.code);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef} id="fg-item-autocomplete-container">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        FG Item Code
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          name="fg-item-search-no-autofill"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium text-slate-800"
          id="fg-item-search-input"
        />
      </div>

      {isOpen && (
        <div className="absolute z-40 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto" id="autocomplete-results-dropdown">
          <div className="p-1">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center">
                No matching items found
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.code === selectedCode;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full flex flex-col items-start px-3 py-2 text-left rounded-lg transition-colors duration-150 ${isSelected
                      ? 'bg-sky-50 text-sky-900 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    id={`select-item-${item.code}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs font-semibold tracking-wide bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                        {item.code}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="text-xs font-semibold mt-1 truncate max-w-full">
                      {item.name}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded font-medium">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-sky-600 bg-sky-50 px-1 py-0.5 rounded font-mono font-medium">
                        {item.drawingRev}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
