import React from "react";
import { Edit2, Trash2 } from "lucide-react";

const AdminProductListView = ({ products, onDelete }) => {
  if (!products) return null;

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b font-black text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-4 py-4">Type</th>
              <th className="px-4 py-4">Naam / ID</th>
              <th className="px-4 py-4">ID (mm)</th>
              <th className="px-4 py-4">PN</th>
              <th className="px-4 py-4">Verbinding</th>
              <th className="px-4 py-4 text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-blue-50/50 transition-colors group"
              >
                <td className="px-4 py-3 font-bold text-blue-600 uppercase">
                  {p.type}
                </td>
                <td className="px-4 py-3 text-slate-700 font-semibold">
                  {p.name || p.id}
                </td>
                <td className="px-4 py-3 font-mono">{p.diameter}</td>
                <td className="px-4 py-3">PN {p.pressure}</td>
                <td className="px-4 py-3 text-slate-500">
                  {p.connection || "-"}
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button className="text-slate-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center text-slate-400 italic font-medium">
            Geen producten gevonden om weer te geven.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProductListView;
