import React from "react";
import { Search } from "lucide-react";

const PlanningSidebar = ({
  orders,
  selectedOrder,
  onSelect,
  searchTerm,
  setSearchTerm,
  weekFilter,
  setWeekFilter,
}) => (
  <div className="col-span-12 lg:col-span-4 bg-white rounded-[32px] border border-slate-200 p-6 flex flex-col overflow-hidden shadow-sm h-full text-left">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-black text-xs uppercase text-slate-400 italic">
        Planning
      </h3>
      <div className="flex gap-1 text-left">
        {["previous", "current", "next", "all"].map((wf) => (
          <button
            key={wf}
            onClick={() => setWeekFilter(wf)}
            className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${
              weekFilter === wf
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-400 border-slate-100 hover:bg-slate-50"
            }`}
          >
            {wf}
          </button>
        ))}
      </div>
    </div>
    <div className="relative mb-6 text-left">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
        size={16}
      />
      <input
        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-xs font-bold outline-none focus:bg-white focus:border-blue-400 shadow-inner"
        placeholder="Zoek op order..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar text-left">
      {orders.map((orderItem) => (
        <div
          key={orderItem.id}
          onClick={() => onSelect(orderItem)}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedOrder?.id === orderItem.id
              ? "border-blue-500 bg-blue-50/30 shadow-md"
              : "border-transparent bg-slate-50 hover:bg-white hover:border-slate-200"
          }`}
        >
          <div className="flex justify-between mb-1 text-left">
            <span className="text-[10px] font-mono font-bold text-blue-600 text-left">
              {orderItem.orderId}
            </span>
            <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 rounded italic text-left">
              {orderItem.machine}
            </span>
          </div>
          <h4 className="font-black text-xs text-slate-800 leading-tight text-left truncate">
            {orderItem.item}
          </h4>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden text-left">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{
                  width: `${
                    (Number(orderItem.toDo) / Number(orderItem.plan)) * 100
                  }%`,
                }}
              />
            </div>
            <span className="text-[8px] font-black w-10 text-right text-left">
              {orderItem.toDo || 0}/{orderItem.plan}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PlanningSidebar;
