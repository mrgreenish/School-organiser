"use client";

import { useState } from "react";

interface ChildNameInputProps {
  childName: string;
  childClass: string;
  onChangeName: (name: string) => void;
  onChangeClass: (cls: string) => void;
}

export default function ChildNameInput({
  childName,
  childClass,
  onChangeName,
  onChangeClass,
}: ChildNameInputProps) {
  const [editing, setEditing] = useState(!childName);

  const handleBlur = () => {
    if (childName.trim()) setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && childName.trim()) setEditing(false);
  };

  if (!editing && childName) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <span>👧 {childName}</span>
        {childClass && (
          <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
            {childClass}
          </span>
        )}
        <span className="text-xs text-gray-400">✏️</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-400 whitespace-nowrap">Child</label>
        <input
          type="text"
          value={childName}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Olivia"
          autoFocus
          className="text-sm border border-gray-300 rounded-md px-2.5 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-400 whitespace-nowrap">Class</label>
        <input
          type="text"
          value={childClass}
          onChange={(e) => onChangeClass(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 1A"
          className="text-sm border border-gray-300 rounded-md px-2.5 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
