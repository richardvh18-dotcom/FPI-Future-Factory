import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId, logActivity, auth } from "../../config/firebase";
import { UserCheck, Check, X, Mail, MapPin } from "lucide-react";

const AdminRequestsView = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "artifacts", appId, "account_requests"),
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, []);

  const approve = async (req) => {
    try {
      await setDoc(
        doc(db, "artifacts", appId, "user_roles", req.email.toLowerCase()),
        {
          name: req.name,
          role: "user",
          group: "Techniek",
          country: req.country || "Nederland",
        }
      );
      await deleteDoc(doc(db, "artifacts", appId, "account_requests", req.id));
      logActivity(
        auth.currentUser,
        "APPROVE_USER",
        `Account ${req.email} goedgekeurd.`
      );
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in">
      <h2 className="text-2xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
        <UserCheck className="text-orange-600" /> Wachtende Aanvragen
      </h2>
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm hover:border-blue-300 transition-all"
          >
            <div className="flex gap-4 items-center">
              <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold">
                {req.name?.charAt(0)}
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">
                  {req.name}{" "}
                  <span className="text-slate-400 font-medium text-xs">
                    ({req.email})
                  </span>
                </p>
                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-widest">
                  <MapPin size={10} /> {req.country || "Nederland"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve(req)}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg shadow-green-100"
              >
                <Check size={20} />
              </button>
              <button
                onClick={() =>
                  deleteDoc(
                    doc(db, "artifacts", appId, "account_requests", req.id)
                  )
                }
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="p-20 text-center border-4 border-dashed rounded-3xl text-slate-300 font-black uppercase tracking-widest">
            Geen nieuwe aanvragen
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestsView;
