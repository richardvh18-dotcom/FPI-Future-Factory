import React from "react";
import { Mail, MailOpen, Trash2, User, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const InboxView = ({ messages, userEmail, onMarkRead, onDelete }) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Mail size={48} className="mb-4 opacity-20" />
        <p className="font-bold">Geen berichten</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        // Bepaal status
        const isMe = msg.from === userEmail;
        const isRead = msg.readBy?.includes(userEmail) || isMe; // Eigen berichten zijn altijd 'gelezen'
        const isBroadcast = msg.to === "all";

        return (
          <div
            key={msg.id}
            onClick={() => (!isMe && !isRead ? onMarkRead(msg.id) : null)}
            className={`
                group relative bg-white border rounded-xl p-4 transition-all cursor-pointer hover:shadow-md
                ${
                  !isRead ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
                }
            `}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {/* Icoon: Envelop of Eigen Avatar */}
                <div
                  className={`p-2 rounded-lg ${
                    !isRead
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isMe ? (
                    <User size={16} />
                  ) : isRead ? (
                    <MailOpen size={16} />
                  ) : (
                    <Mail size={16} />
                  )}
                </div>

                <div>
                  <h4
                    className={`text-sm ${
                      !isRead
                        ? "font-black text-slate-800"
                        : "font-bold text-slate-600"
                    }`}
                  >
                    {msg.subject}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-medium">
                      {isMe
                        ? `Aan: ${isBroadcast ? "Iedereen" : msg.to}`
                        : `Van: ${msg.fromName || msg.from}`}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {msg.timestamp
                        ? format(msg.timestamp.toDate(), "dd MMM HH:mm", {
                            locale: nl,
                          })
                        : "Zojuist"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acties */}
              <div className="flex items-center gap-2">
                {!isRead && (
                  <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Nieuw
                  </span>
                )}
                {isMe && isBroadcast && (
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-200">
                    Broadcast
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(msg.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Verwijderen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <p
              className={`text-sm leading-relaxed ${
                !isRead ? "text-slate-700 font-medium" : "text-slate-500"
              }`}
            >
              {msg.body}
            </p>

            {/* Read Receipts voor eigen verzonden berichten (optioneel) */}
            {isMe && msg.readBy && msg.readBy.length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" />
                Gelezen door {msg.readBy.length} mensen
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InboxView;
