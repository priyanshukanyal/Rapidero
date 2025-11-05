// // src/pages/client/ConsignmentView.tsx
// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { getMyConsignment, getMyTracking } from "../../api/client";

// export default function ClientCNView() {
//   const { id } = useParams();
//   const [cn, setCn] = useState<any>(null);
//   const [track, setTrack] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     (async () => {
//       try {
//         const [a, b] = await Promise.all([
//           getMyConsignment(id!),
//           getMyTracking(id!),
//         ]);
//         setCn(a);
//         // setTrack(b);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [id]);

//   if (loading) return <div>Loading…</div>;
//   if (!cn) return <div>Not found</div>;

//   return (
//     <div className="space-y-6">
//       <h1 className="text-xl font-semibold">CN {cn.cn_number}</h1>

//       <div className="grid md:grid-cols-2 gap-4">
//         <Info title="Status" value={cn.current_status_code} />
//         <Info
//           title="Route"
//           value={`${cn.shipper_city} → ${cn.consignee_city}`}
//         />
//         <Info title="Weight" value={`${cn.actual_weight_kg ?? "-"} kg`} />
//         <Info
//           title="Booked"
//           value={
//             cn.booking_datetime
//               ? new Date(cn.booking_datetime).toLocaleString()
//               : "-"
//           }
//         />
//       </div>

//       <div className="bg-white rounded-xl p-4 shadow">
//         <h3 className="font-medium mb-2">Tracking</h3>
//         <ul className="space-y-2">
//           {track.map((e: any, i: number) => (
//             <li key={i} className="flex items-start gap-3">
//               <span className="font-mono text-xs">
//                 {new Date(e.event_time).toLocaleString()}
//               </span>
//               <span className="text-sm">
//                 <b>{e.status_code}</b>
//                 {e.location_text ? ` — ${e.location_text}` : ""}
//                 {e.remarks ? ` — ${e.remarks}` : ""}
//               </span>
//             </li>
//           ))}
//           {track.length === 0 && (
//             <li className="text-sm text-gray-500">No events yet.</li>
//           )}
//         </ul>
//       </div>
//     </div>
//   );
// }
// function Info({ title, value }: { title: string; value: any }) {
//   return (
//     <div className="bg-white rounded-xl p-4 shadow">
//       <div className="text-xs text-gray-500">{title}</div>
//       <div className="font-medium">{value}</div>
//     </div>
//   );
// }
